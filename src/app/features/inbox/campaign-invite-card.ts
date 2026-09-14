import { Component, inject, input, output, computed } from '@angular/core';
import { CampaignInvite } from '../../core/inbox-store';
import { LocaleService } from '../../core/locale';
import { getCover, getCoverImagePath } from '../../core/campaign-covers';
import { formatDateTime } from '../../core/datetime-local';

@Component({
  selector: 'app-campaign-invite-card',
  standalone: true,
  templateUrl: './campaign-invite-card.html',
})
export class CampaignInviteCard {
  protected readonly localeService = inject(LocaleService);

  readonly invite = input.required<CampaignInvite>();
  readonly accept = output<CampaignInvite>();
  readonly decline = output<CampaignInvite>();

  protected readonly coverImagePath = computed(() => getCoverImagePath(getCover(this.invite().coverKey)));
  protected readonly nextSession = computed(() => formatDateTime(this.invite().nextSessionAt, this.localeService.locale()));
}
