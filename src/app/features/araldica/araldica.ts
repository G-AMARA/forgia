import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Supabase } from '../../core/supabase';
import { Auth } from '../../core/auth';
import { FATO_RANK, getRankForSeconds, hoursToExp, RANK_TIERS, rankIndex, RankTier } from '../../core/ranks';

@Component({
  selector: 'app-araldica',
  standalone: true,
  templateUrl: './araldica.html',
})
export class Araldica implements OnInit, OnDestroy {
  private supabase = inject(Supabase);
  protected auth = inject(Auth);

  protected rank = signal<RankTier | null>(null);
  protected navigationHours = signal(0);
  protected showLevelUp = signal(false);
  protected showRanksModal = signal(false);

  // Elenco decrescente (Fato in cima come rango speciale) per la modale dei ranghi.
  protected readonly rankList = [FATO_RANK, ...RANK_TIERS].slice().reverse();
  protected readonly hoursToExp = hoursToExp;

  private channel: RealtimeChannel | null = null;

  private storageKey(userId: string): string {
    return `araldica_rank_${userId}`;
  }

  async ngOnInit() {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    const { data } = await this.supabase.client
      .from('profiles')
      .select('navigation_seconds')
      .eq('id', userId)
      .single();

    this.applySeconds(userId, data?.navigation_seconds ?? 0);

    // Realtime: quando il NavigationTracker accredita secondi sul profilo (anche
    // da un'altra tab), il rango qui si aggiorna da solo senza dover ricaricare.
    this.channel = this.supabase.client
      .channel(`profile-rank-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => this.applySeconds(userId, (payload.new as any)?.navigation_seconds ?? 0)
      )
      .subscribe();
  }

  ngOnDestroy() {
    if (this.channel) {
      this.supabase.client.removeChannel(this.channel);
    }
  }

  private applySeconds(userId: string, seconds: number) {
    const newRank = getRankForSeconds(seconds, this.auth.isAdmin());
    const newIndex = rankIndex(newRank);

    this.navigationHours.set(Math.floor(seconds / 3600));

    // Livello salito rispetto alla sessione precedente = rispetto all'ultimo rango
    // noto persistito in localStorage. null significa prima visita mai su questo
    // browser: in quel caso non deve scattare l'animazione "level up".
    const stored = localStorage.getItem(this.storageKey(userId));
    const previousIndex = stored !== null ? Number(stored) : null;

    if (previousIndex !== null && newIndex > previousIndex) {
      this.showLevelUp.set(true);
      setTimeout(() => this.showLevelUp.set(false), 4000);
    }

    localStorage.setItem(this.storageKey(userId), String(newIndex));
    this.rank.set(newRank);
  }
}
