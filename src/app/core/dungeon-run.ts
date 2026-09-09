import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';

export interface RunAwardResult {
  xpAwarded: number;
  error: { message: string } | null;
  // true quando l'errore è "hai già giocato oggi" (la RPC ha già accreditato un tentativo
  // in questa stessa giornata): non è un guasto, il chiamante non deve mostrarlo come
  // errore ma solo azzerare l'XP mostrato.
  giaAccreditatoOggi: boolean;
}

// Il platformer del Dungeon EXP Hub (DungeonRunScene, Phaser 3) assegna XP che accredita
// davvero l'Araldica (profiles.navigation_seconds, vedi core/ranks.ts): il limite "1
// accredito al giorno" è imposto dalla RPC award_dungeon_run_xp
// (sql/2026-09-09_dungeon_run_xp.sql) lato server, non qui — il gioco gira interamente nel
// canvas del client, quindi gemme raccolte e completamento riportati da Phaser non sono
// mai fidati ciecamente: la RPC li ricontrolla contro i limiti reali del livello.
@Injectable({ providedIn: 'root' })
export class DungeonRun {
  private supabase = inject(Supabase);
  private auth = inject(Auth);

  // Stesso comportamento di DungeonQuiz.playedToday() (core/dungeon-quiz.ts): nessun bypass
  // di comodo per i test, il blocco locale rispecchia sempre lo stato reale su Supabase.
  async playedToday(): Promise<boolean> {
    const userId = this.auth.user()?.id;
    if (!userId) return true;

    const { data } = await this.supabase.client
      .from('profiles')
      .select('dungeon_run_last_completed_at')
      .eq('id', userId)
      .single();

    const last = data?.dungeon_run_last_completed_at;
    if (!last) return false;
    return new Date(last).toDateString() === new Date().toDateString();
  }

  // Chiamata a fine partita, sia in caso di vittoria (forziere aperto) sia di sconfitta
  // (morte/caduta): le gemme raccolte fino a quel momento vanno comunque accreditate,
  // solo il bonus di completamento (+10) dipende da `completato`.
  async awardResult(gemme: number, completato: boolean): Promise<RunAwardResult> {
    const { error } = await this.supabase.client.rpc('award_dungeon_run_xp', {
      p_gemme: gemme,
      p_completato: completato,
    });

    if (error) {
      return {
        xpAwarded: 0,
        error: { message: error.message },
        giaAccreditatoOggi: error.message.includes('already completed today'),
      };
    }

    return { xpAwarded: gemme * 1 + (completato ? 10 : 0), error: null, giaAccreditatoOggi: false };
  }
}
