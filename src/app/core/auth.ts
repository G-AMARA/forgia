import { Injectable, inject, signal, computed } from '@angular/core';
import { Supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

// Riga di profiles per la sezione Gestione > Utenti (solo admin): niente email, non è
// leggibile via client (vive in auth.users, vedi emailExists sotto).
export interface AdminProfile {
  id: string;
  nickname: string | null;
  is_master: boolean;
  is_admin: boolean;
  avatar_url: string | null;
}

// Riga di profiles per il pannello Avventurieri (aperto a tutti): niente ruoli/avatar, solo
// quanto serve a calcolare rango ed exp lato client (vedi core/ranks.ts groupByRank, che
// calcola sempre il rango "reale" da ore accumulate, anche per gli admin).
export interface AdventurerProfile {
  id: string;
  nickname: string | null;
  navigation_seconds: number;
}

export type Role = 'player' | 'master' | 'admin';

const VIEW_ROLE_KEY_PREFIX = 'fanta-view-role-';

@Injectable({ providedIn: 'root' })
export class Auth {
  private supabase = inject(Supabase);

  private _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = signal(false);

  private _nickname = signal<string | null>(null);
  readonly nickname = this._nickname.asReadonly();

  // Ruoli REALI da DB (profiles.is_master/is_admin): is_admin va assegnato a mano sul DB
  // (o da un altro admin via Gestione > Utenti) la prima volta, e non cambia mai da solo
  // per un self-service da Impostazioni (vedi setViewRole sotto per il perché).
  private _isMasterDb = signal<boolean>(false);
  private _isAdminDb = signal<boolean>(false);
  // Esposto per Impostazioni: decide se mostrare l'opzione "Admin" nel selettore ruolo,
  // indipendentemente dalla modalità di visualizzazione corrente.
  readonly realIsAdmin = this._isAdminDb.asReadonly();

  // Override locale di SOLA visualizzazione, persistito in localStorage (chiave per utente)
  // così sopravvive a reload e cambi pagina. Permette a chi è VERAMENTE admin di "vedersi"
  // come Player/Master/Admin senza mai scrivere su profiles.is_admin: prima, scegliere
  // "Player" da Impostazioni scriveva is_admin=false sul DB, e se non c'era già un altro
  // admin pronto a ripromuoverlo da Gestione > Utenti restava bloccato fuori per sempre.
  // Per chi non è admin resta sempre null (vedi loadProfile).
  private _viewRole = signal<Role | null>(null);

  // Ruolo effettivo di tutta l'app (gating di Gestione, readOnly sulle schede altrui, ecc.):
  // per un vero admin è l'ultima modalità scelta con setViewRole (default 'admin' al primo
  // login), per tutti gli altri è semplicemente il ruolo reale da DB.
  readonly role = computed<Role>(() =>
    this._isAdminDb() ? this._viewRole() ?? 'admin' : this._isMasterDb() ? 'master' : 'player'
  );

  readonly isMaster = computed(() => this.role() !== 'player');
  readonly isAdmin = computed(() => this.role() === 'admin');

  private _avatarUrl = signal<string | null>(null);
  readonly avatarUrl = this._avatarUrl.asReadonly();

  // Secondi di navigazione accreditati (vedi NavigationTracker): serve a calcolare il
  // rango araldico dell'utente corrente lato client (NpcStore.myNpcLimit), senza un
  // secondo round-trip a profiles.
  private _navigationSeconds = signal(0);
  readonly navigationSeconds = this._navigationSeconds.asReadonly();

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
      this._isMasterDb.set(false);
      this._isAdminDb.set(false);
      this._viewRole.set(null);
      this._avatarUrl.set(null);
      this._navigationSeconds.set(0);
      return;
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('nickname, is_master, is_admin, avatar_url, navigation_seconds')
      .eq('id', userId)
      .single();

    if (error) {
      this._nickname.set(null);
      this._isMasterDb.set(false);
      this._isAdminDb.set(false);
      this._viewRole.set(null);
      this._avatarUrl.set(null);
      this._navigationSeconds.set(0);
      return;
    }

    this._nickname.set(data?.nickname ?? null);
    this._isMasterDb.set(data?.is_master ?? false);
    this._isAdminDb.set(data?.is_admin ?? false);
    this._avatarUrl.set(data?.avatar_url ?? null);
    this._navigationSeconds.set(data?.navigation_seconds ?? 0);
    // La modalità di visualizzazione ha senso solo per un vero admin: per chiunque altro
    // resta null (= usa il ruolo reale), anche se in localStorage fosse rimasto un valore
    // di quando l'account era admin (es. dopo una revoca da Gestione > Utenti).
    this._viewRole.set(data?.is_admin ? this.readStoredViewRole(userId) : null);
  }

  private readStoredViewRole(userId: string): Role | null {
    const stored = localStorage.getItem(VIEW_ROLE_KEY_PREFIX + userId);
    return stored === 'admin' || stored === 'master' || stored === 'player' ? stored : null;
  }

  // Cambia SOLO la modalità di visualizzazione (mai profiles.is_admin): per questo è
  // sicura da richiamare in qualunque momento, anche dopo un reload, senza rischio di
  // restare bloccati fuori da Gestione. No-op se chi chiama non è davvero admin su DB.
  setViewRole(role: Role) {
    if (!this._isAdminDb()) return;
    this._viewRole.set(role);
    const userId = this._user()?.id;
    if (userId) localStorage.setItem(VIEW_ROLE_KEY_PREFIX + userId, role);
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

  // Aggiorna nickname e ruolo Master/Player REALE su DB. Non scrive mai is_admin: la
  // diventi admin solo a mano sul DB la prima volta, o da un altro admin via Gestione >
  // Utenti in seguito. Usata da Impostazioni solo per chi NON è già admin (per un vero
  // admin il ruolo qui è solo visualizzazione, vedi setViewRole + updateNickname).
  async updateProfile(nickname: string, isMaster: boolean) {
    const userId = this._user()?.id;
    if (!userId) {
      return { error: { message: 'Non autenticato' } };
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({ nickname, is_master: isMaster })
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

  // Come updateProfile ma senza toccare is_master: usata da Impostazioni per un vero admin,
  // dove il selettore ruolo passa da setViewRole (locale) invece che dal DB.
  async updateNickname(nickname: string) {
    const userId = this._user()?.id;
    if (!userId) {
      return { error: { message: 'Non autenticato' } };
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({ nickname })
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

  // Solo per admin (RLS "Lettura pubblica profili" è comunque qual: true): elenco di tutti
  // i profili per la sezione Gestione > Utenti.
  async listProfiles(): Promise<{ data: AdminProfile[]; error: { message: string } | null }> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id, nickname, is_master, is_admin, avatar_url')
      .order('nickname');

    return { data: data ?? [], error };
  }

  // Cambia ruolo di UN ALTRO utente. Funziona solo se chi chiama è già admin: la RLS
  // "profiles_update_admin" (sql/2026-08-25_profiles_admin_update.sql) è quello che lo
  // permette davvero, questo metodo non fa altro che invocare l'update lato client.
  // Pubblico (RLS "Lettura pubblica profili" è qual: true): elenco di tutti gli iscritti
  // per il pannello Avventurieri, raggruppato per araldica lato client (ranks.groupByRank).
  async listAdventurers(): Promise<{ data: AdventurerProfile[]; error: { message: string } | null }> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id, nickname, navigation_seconds')
      .order('navigation_seconds', { ascending: false });

    return { data: data ?? [], error };
  }

  async updateUserRole(targetId: string, isMaster: boolean, isAdmin: boolean) {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({ is_master: isMaster, is_admin: isAdmin })
      .eq('id', targetId)
      .select();

    if (!error && (!data || data.length === 0)) {
      return {
        error: { message: 'Ruolo non aggiornato: controlla i permessi (RLS) su profiles.' },
      };
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