import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';

export interface CrosswordAwardResult {
  xpAwarded: number;
  error: { message: string } | null;
}

// Terzo minigioco del Dungeon EXP Hub (Parole Crociate D&D, vedi
// features/dungeon-exp/dnd-crossword.ts): stessa architettura di DungeonQuiz/DungeonRun
// (core/dungeon-quiz.ts, core/dungeon-run.ts). La griglia è verificata interamente lato
// client (le risposte vivono nel bundle JS, dnd-crossword-data.ts), quindi qui non si fida
// un punteggio libero: si accredita +2 xp per parola corretta, -1 xp per ogni parola
// sbagliata o non completata (mai sotto 0), e il limite "1 volta al giorno" è imposto dalla
// RPC award_dungeon_crossword_xp (sql/2026-09-09_dungeon_crossword_xp.sql) lato server.
@Injectable({ providedIn: 'root' })
export class DungeonCrossword {
  private supabase = inject(Supabase);
  private auth = inject(Auth);

  async playedToday(): Promise<boolean> {
    const userId = this.auth.user()?.id;
    if (!userId) return true;

    const { data } = await this.supabase.client
      .from('profiles')
      .select('dungeon_crossword_last_completed_at')
      .eq('id', userId)
      .single();

    const last = data?.dungeon_crossword_last_completed_at;
    if (!last) return false;
    return new Date(last).toDateString() === new Date().toDateString();
  }

  // paroleCorrette può essere minore di totaleParole (partita conclusa senza completare la
  // griglia, vedi DdCrossword.guardaRisultato()): la RPC ricalcola l'XP in autonomia da
  // questi due bound (stessa formula qui e sul server), non si fida di un XP calcolato dal
  // client.
  async awardResult(paroleCorrette: number, totaleParole: number): Promise<CrosswordAwardResult> {
    const { error } = await this.supabase.client.rpc('award_dungeon_crossword_xp', {
      p_parole_corrette: paroleCorrette,
      p_totale_parole: totaleParole,
    });

    if (error) {
      return { xpAwarded: 0, error: { message: error.message } };
    }

    const paroleSbagliate = totaleParole - paroleCorrette;
    const xpAwarded = Math.max(0, paroleCorrette * 2 - paroleSbagliate);
    return { xpAwarded, error: null };
  }
}
