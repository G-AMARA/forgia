import { Injectable, inject, effect } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';

// Accredita i secondi di navigazione dell'utente loggato sulla colonna
// profiles.navigation_seconds, un tick alla volta, solo mentre la tab è visibile
// (document.visibilityState === 'visible'): niente ore accreditate a tab in background.
// Richiede la function RPC public.increment_navigation_seconds(p_seconds integer),
// vedi la migrazione SQL descritta accanto a getRankForSeconds in ranks.ts.
@Injectable({ providedIn: 'root' })
export class NavigationTracker {
  private supabase = inject(Supabase);
  private auth = inject(Auth);

  private static readonly TICK_MS = 30_000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTick = Date.now();

  constructor() {
    // Segue lo stato di login: parte al login, si ferma al logout (altrimenti
    // continuerebbe ad accreditare secondi anche senza un utente autenticato).
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  private start() {
    if (this.intervalId) return;
    this.lastTick = Date.now();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.intervalId = setInterval(() => this.tick(), NavigationTracker.TICK_MS);
  }

  private stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  // Ogni volta che la tab torna visibile il conteggio riparte da qui: il tempo
  // passato in background non viene mai accreditato come navigazione attiva.
  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.lastTick = Date.now();
    }
  };

  private async tick() {
    if (document.visibilityState !== 'visible') return;

    const now = Date.now();
    const elapsedSeconds = Math.round((now - this.lastTick) / 1000);
    this.lastTick = now;
    if (elapsedSeconds <= 0) return;

    await this.supabase.client.rpc('increment_navigation_seconds', { p_seconds: elapsedSeconds });
  }
}
