import { Injectable, inject, signal } from '@angular/core';
import { Supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class Auth {
  private supabase = inject(Supabase);

  private _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = signal(false);

  private _nickname = signal<string | null>(null);
  readonly nickname = this._nickname.asReadonly();

  private _isMaster = signal<boolean>(false);
  readonly isMaster = this._isMaster.asReadonly();

  // Ruolo "super utente": non selezionabile in registrazione, va assegnato
  // a mano sul DB (colonna profiles.is_admin) da chi già è admin.
  private _isAdmin = signal<boolean>(false);
  readonly isAdmin = this._isAdmin.asReadonly();

  private _avatarUrl = signal<string | null>(null);
  readonly avatarUrl = this._avatarUrl.asReadonly();

  constructor() {
    // Controlla se c'è già una sessione attiva al caricamento dell'app
    this.supabase.client.auth.getSession().then(({ data }) => {
      this._user.set(data.session?.user ?? null);
      this.isLoggedIn.set(!!data.session?.user);
      this.loadProfile(data.session?.user?.id ?? null);
    });

    // Ascolta cambi di stato (login, logout, refresh token) e aggiorna i signal
    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this._user.set(session?.user ?? null);
      this.isLoggedIn.set(!!session?.user);
      this.loadProfile(session?.user?.id ?? null);
    });
  }

  private async loadProfile(userId: string | null) {
    if (!userId) {
      this._nickname.set(null);
      this._isMaster.set(false);
      this._isAdmin.set(false);
      this._avatarUrl.set(null);
      return;
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('nickname, is_master, is_admin, avatar_url')
      .eq('id', userId)
      .single();

    if (error) {
      this._nickname.set(null);
      this._isMaster.set(false);
      this._isAdmin.set(false);
      this._avatarUrl.set(null);
      return;
    }

    this._nickname.set(data?.nickname ?? null);
    this._isMaster.set(data?.is_master ?? false);
    this._isAdmin.set(data?.is_admin ?? false);
    this._avatarUrl.set(data?.avatar_url ?? null);
  }

  async signUp(email: string, password: string, nickname: string, isMaster: boolean) {
    // nickname e is_master viaggiano come metadata dell'utente: li legge il trigger
    // handle_new_user() lato DB (vedi sql/2026-08-16_profiles_signup_trigger.sql) per
    // creare la riga profiles. Non possiamo farlo qui con un insert diretto: se la
    // conferma email è attiva, subito dopo signUp() non esiste ancora una sessione
    // autenticata, e l'insert fallirebbe la RLS (id = auth.uid(), con auth.uid() nullo).
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: {
        data: { nickname, is_master: isMaster },
        // Senza questo, Supabase reindirizza il link di conferma email al "Site URL"
        // configurato da dashboard (che va comunque tenuto allineato, altrimenti questo
        // valore viene ignorato). document.baseURI rispetta il <base href>, quindi
        // funziona sia in locale che pubblicato in una sottocartella (GitHub Pages /forgia/).
        emailRedirectTo: document.baseURI,
      },
    });

    if (error || !data.user) {
      return { data, error };
    }

    // Il profilo è leggibile subito indipendentemente dalla sessione (la policy SELECT
    // "Lettura pubblica profili" ha qual: true) e il trigger lo crea in modo sincrono
    // nella stessa transazione di signUp(), quindi possiamo ricaricarlo già ora.
    await this.loadProfile(data.user.id);

    return { data, error: null };
  }

  // Riusa la stessa RPC del login (SECURITY DEFINER, bypassa la RLS che altrimenti
  // limiterebbe la select su profiles alla sola riga dell'utente): se restituisce
  // un'email, quel nickname è già occupato da un altro account.
  async nicknameExists(nickname: string): Promise<boolean> {
    const { data } = await this.supabase.client.rpc('get_email_for_nickname', {
      p_nickname: nickname,
    });
    return !!data;
  }

  // Come nicknameExists ma sull'email: richiede l'RPC SECURITY DEFINER email_exists,
  // perché l'email vive in auth.users (non in profiles) e non è leggibile via client.
  async emailExists(email: string): Promise<boolean> {
    const { data } = await this.supabase.client.rpc('email_exists', { p_email: email });
    return !!data;
  }

  async signInWithNickname(nickname: string, password: string) {
    const { data: email, error: rpcError } = await this.supabase.client.rpc(
      'get_email_for_nickname',
      { p_nickname: nickname }
    );

    if (rpcError || !email) {
      return { data: null, error: { message: 'Nickname o password non validi' } };
    }

    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  async signOut() {
    const { error } = await this.supabase.client.auth.signOut();
    return { error };
  }

  // Il login usa il nickname, non l'email: per il recupero risolviamo prima
  // l'email tramite la stessa RPC usata in signInWithNickname.
  async recoverPassword(nickname: string) {
    const { data: email, error: rpcError } = await this.supabase.client.rpc(
      'get_email_for_nickname',
      { p_nickname: nickname }
    );

    if (rpcError || !email) {
      return { error: { message: 'Nickname non trovato' } };
    }

    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, {
      // document.baseURI (non window.location.origin) rispetta il <base href>, quindi
      // funziona anche quando l'app è pubblicata in una sottocartella (es. GitHub Pages /forgia/).
      redirectTo: `${document.baseURI}reset-password`,
    });
    return { error };
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.client.auth.updateUser({ password: newPassword });
    return { error };
  }

  // Diventare admin resta possibile solo a mano sul DB (nessun percorso qui porta
  // isAdmin da false a true): il chiamante (Profile) passa isAdmin=true solo se
  // l'utente lo era già all'apertura della pagina. La sicurezza reale però sta
  // nella RLS su profiles.is_admin lato Supabase, non in questo controllo client.
  async updateProfile(nickname: string, isMaster: boolean, isAdmin: boolean) {
    const userId = this._user()?.id;
    if (!userId) {
      return { error: { message: 'Non autenticato' } };
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({ nickname, is_master: isMaster, is_admin: isAdmin })
      .eq('id', userId)
      .select();

    if (!error && (!data || data.length === 0)) {
      return {
        error: { message: 'Profilo non aggiornato: controlla i permessi (RLS) su profiles.' },
      };
    }

    if (!error) {
      await this.loadProfile(userId);
    }

    return { error };
  }

  async uploadAvatar(file: File) {
    const userId = this._user()?.id;
    if (!userId) {
      return { error: { message: 'Non autenticato' } };
    }

    const ext = file.name.split('.').pop();
    const path = `${userId}/profile.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      return { error: uploadError };
    }

    const { data: urlData } = this.supabase.client.storage.from('avatars').getPublicUrl(path);

    // getPublicUrl() è deterministico sul path: se si ricarica una foto con la stessa
    // estensione, l'URL torna identico a quello già salvato. Senza cache-bust né il
    // signal (stesso valore = nessun re-render) né il browser (stesso URL = cache) si
    // accorgono che l'immagine è cambiata, quindi l'utente non vede alcun aggiornamento.
    const cacheBustedUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    // .update() senza .select() non segnala nulla se la RLS blocca la riga: PostgREST
    // risponde "successo, 0 righe toccate" senza errore. Il .select() forza a scoprirlo.
    const { data: updateData, error: updateError } = await this.supabase.client
      .from('profiles')
      .update({ avatar_url: cacheBustedUrl })
      .eq('id', userId)
      .select();

    if (!updateError && (!updateData || updateData.length === 0)) {
      return {
        error: {
          message: 'Foto caricata ma il profilo non è stato aggiornato: controlla i permessi (RLS) su profiles.avatar_url.',
        },
      };
    }

    if (!updateError) {
      await this.loadProfile(userId);
    }

    return { error: updateError };
  }
}