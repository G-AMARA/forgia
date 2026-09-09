import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { getRankForSeconds, secondsToExp, RankTier } from '../../core/ranks';

// Popup "araldica altrui" aperto dal bottone oro sulle card del roster in campaign-hub
// (chi non è owner/admin del PG vede il nickname del proprietario invece di "Rimuovi").
// A differenza di app-araldica (sempre e solo il proprio profilo), qui il rango si
// calcola per un owner_id qualunque, passato via Input.
@Component({
  selector: 'app-player-heraldry-modal',
  standalone: true,
  templateUrl: './player-heraldry-modal.html',
})
export class PlayerHeraldryModal implements OnInit {
  private supabase = inject(Supabase);
  protected localeService = inject(LocaleService);

  @Input({ required: true }) ownerId!: string;
  @Input({ required: true }) ownerNickname!: string;
  @Output() closed = new EventEmitter<void>();

  protected readonly secondsToExp = secondsToExp;

  protected loading = signal(true);
  protected rank = signal<RankTier | null>(null);
  // Secondi grezzi, non ore arrotondate: vedi il commento in Araldica.navigationSeconds.
  protected navigationSeconds = signal(0);

  async ngOnInit() {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('navigation_seconds, is_admin')
      .eq('id', this.ownerId)
      .single();

    const seconds = data?.navigation_seconds ?? 0;
    this.navigationSeconds.set(seconds);
    this.rank.set(getRankForSeconds(seconds, data?.is_admin ?? false));
    this.loading.set(false);
  }

  close() {
    this.closed.emit();
  }
}
