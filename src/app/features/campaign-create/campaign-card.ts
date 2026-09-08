import { Component, computed, inject, input, output } from '@angular/core';
import { Campaign } from '../../core/active-campaign';
import { LocaleService } from '../../core/locale';
import { getCover, getCoverImagePath } from '../../core/campaign-covers';
import { formatDateTime } from '../../core/datetime-local';

const STATUS_BADGE_CLASS: Record<Campaign['status'], string> = {
  active: 'border-forest text-forest bg-forest/10',
  paused: 'border-fantasy-gold text-fantasy-gold bg-gold/10',
  completed: 'border-slate-arcane text-slate-arcane bg-slate-arcane/10',
};

// Scheda di una campagna nella griglia "Campagne esistenti" (CampaignCreate): sola
// presentazione, ogni azione viene delegata al genitore via output (che possiede Modal
// per la conferma di eliminazione, vedi CampaignCreate.deleteCampaign).
@Component({
  selector: 'app-campaign-card',
  standalone: true,
  templateUrl: './campaign-card.html',
})
export class CampaignCard {
  protected localeService = inject(LocaleService);

  campaign = input.required<Campaign>();
  isActive = input(false);

  select = output<void>();
  remove = output<void>();

  protected getCoverImagePath = getCoverImagePath;
  protected cover = computed(() => getCover(this.campaign().cover_key));
  protected nextSession = computed(() =>
    formatDateTime(this.campaign().next_session_at, this.localeService.locale())
  );
  protected statusBadgeClass = computed(() => STATUS_BADGE_CLASS[this.campaign().status]);
}
