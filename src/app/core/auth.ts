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
      return;
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('nickname, is_master, is_admin')
      .eq('id', userId)
      .single();

    if (error) {
      this._nickname.set(null);
      this._isMaster.set(false);
      this._isAdmin.set(false);
      return;
    }

    this._nickname.set(data?.nickname ?? null);
    this._isMaster.set(data?.is_master ?? false);
    this._isAdmin.set(data?.is_admin ?? false);
  }

  async signUp(email: string, password: string, nickname: string, isMaster: boolean) {
    const { data, error } = await this.supabase.client.auth.signUp({ email, password });

    if (error || !data.user) {
      return { data, error };
    }

    const { error: profileError } = await this.supabase.client
      .from('profiles')
      .insert({ id: data.user.id, nickname, is_master: isMaster });

    if (profileError) {
      return { data, error: profileError };
    }

    // Il profilo è stato appena creato: ricarichiamolo subito,
    // senza aspettare un evento onAuthStateChange che non arriverà più
    // (la sessione era già attiva prima che il profilo esistesse).
    await this.loadProfile(data.user.id);

    return { data, error: null };
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
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.client.auth.updateUser({ password: newPassword });
    return { error };
  }
}