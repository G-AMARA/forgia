import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Supabase } from '../../core/supabase';
import { Auth, AdventurerProfile } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { getRankForSeconds } from '../../core/ranks';

@Component({
  selector: 'app-invite-adventurer-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './invite-adventurer-modal.html',
})
export class InviteAdventurerModal implements OnInit {
  private supabase = inject(Supabase);
  private auth = inject(Auth);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  @Input({ required: true }) campaignId!: string;
  @Output() closed = new EventEmitter<void>();

  protected loading = signal(true);
  protected sending = signal(false);
  protected searchTerm = signal('');
  protected adventurers = signal<AdventurerProfile[]>([]);
  // Membri già in campagna + inviti già pendenti + se stessi: esclusi dai risultati,
  // non ha senso re-invitarli.
  private excludedIds = signal<Set<string>>(new Set());
  protected selectedIds = signal<Set<string>>(new Set());

  protected readonly filteredAdventurers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.adventurers()
      .filter((a) => !this.excludedIds().has(a.id))
      .filter((a) => !term || (a.nickname ?? '').toLowerCase().includes(term));
  });

  async ngOnInit() {
    this.loading.set(true);

    const [{ data: allAdventurers }, { data: members }, { data: activeInvites }] = await Promise.all([
      this.auth.listAdventurers(),
      this.supabase.client.from('characters').select('owner_id').eq('campaign_id', this.campaignId),
      // Solo pending/accepted: un utente che ha RIFIUTATO resta invitabile di nuovo
      // (sendInvites lo riporta a 'pending' con l'upsert, vedi sotto).
      this.supabase.client
        .from('campaign_invites')
        .select('invited_user_id')
        .eq('campaign_id', this.campaignId)
        .in('status', ['pending', 'accepted']),
    ]);

    const excluded = new Set<string>([
      this.auth.user()?.id ?? '',
      ...(members ?? []).map((m: any) => m.owner_id),
      ...(activeInvites ?? []).map((i: any) => i.invited_user_id),
    ]);

    this.adventurers.set(allAdventurers);
    this.excludedIds.set(excluded);
    this.loading.set(false);
  }

  // Stesso approccio del roster Avventurieri (groupByRank): senza is_admin nel profilo,
  // il rango di un admin è calcolato come utente normale (isAdmin=false).
  protected rankIcon(navigationSeconds: number): string {
    return getRankForSeconds(navigationSeconds, false).icon;
  }

  protected toggle(id: string) {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected async sendInvites() {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;

    this.sending.set(true);

    // Niente ignoreDuplicates: se esiste già una riga 'declined' per questo utente/campagna
    // (unique su campaign_id+invited_user_id), l'upsert la aggiorna riportandola a 'pending'
    // invece di lasciarla com'era.
    const rows = ids.map((id) => ({
      campaign_id: this.campaignId,
      invited_user_id: id,
      invited_by: this.auth.user()!.id,
      status: 'pending' as const,
    }));

    const { error } = await this.supabase.client
      .from('campaign_invites')
      .upsert(rows, { onConflict: 'campaign_id,invited_user_id' });

    this.sending.set(false);

    if (error) {
      this.modal.error(error.message);
      return;
    }

    await this.modal.success(this.localeService.t('invite_sent_success'));
    this.closed.emit();
  }

  protected cancel() {
    this.closed.emit();
  }
}
