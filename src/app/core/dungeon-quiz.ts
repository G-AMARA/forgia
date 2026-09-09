import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';

export interface QuizAwardResult {
  xpAwarded: number;
  error: { message: string } | null;
}

// Il quiz del Dungeon EXP Hub (DdQuiz) assegna XP che accredita davvero l'Araldica
// (profiles.navigation_seconds, vedi core/ranks.ts): il limite "1 tentativo al giorno" è
// imposto dalla RPC award_dungeon_quiz_xp (sql/2026-09-09_dungeon_quiz_xp.sql) lato server,
// non solo qui, altrimenti si aggirerebbe pulendo lo stato locale.
@Injectable({ providedIn: 'root' })
export class DungeonQuiz {
  private supabase = inject(Supabase);
  private auth = inject(Auth);

  async playedToday(): Promise<boolean> {
    const userId = this.auth.user()?.id;
    if (!userId) return true;

    const { data } = await this.supabase.client
      .from('profiles')
      .select('dungeon_quiz_last_completed_at')
      .eq('id', userId)
      .single();

    const last = data?.dungeon_quiz_last_completed_at;
    if (!last) return false;
    return new Date(last).toDateString() === new Date().toDateString();
  }

  async awardResult(correctAnswers: number): Promise<QuizAwardResult> {
    const { error } = await this.supabase.client.rpc('award_dungeon_quiz_xp', {
      p_correct: correctAnswers,
    });

    if (error) {
      return { xpAwarded: 0, error: { message: error.message } };
    }

    return { xpAwarded: correctAnswers * 5 + 20, error: null };
  }
}
