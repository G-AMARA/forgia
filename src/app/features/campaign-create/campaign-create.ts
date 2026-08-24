import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActiveCampaign, CampaignStatus } from '../../core/active-campaign';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { CAMPAIGN_COVERS, getCoverImagePath } from '../../core/campaign-covers';
import { fromDatetimeLocalValue } from '../../core/datetime-local';

@Component({
  selector: 'app-campaign-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './campaign-create.html',
})
export class CampaignCreate {
  protected campaignStore = inject(ActiveCampaign);
  protected auth = inject(Auth);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  readonly maxDescriptionLength = 700;
  readonly statuses: CampaignStatus[] = ['active', 'paused', 'completed'];

  covers = CAMPAIGN_COVERS;
  getCoverImagePath = getCoverImagePath;

  name = '';
  description = '';
  editionCode = '5e-2014';
  coverKey = CAMPAIGN_COVERS[0].key;
  status: CampaignStatus = 'active';
  nextSessionAtLocal = '';
  maxPlayers: number | null = null;
  startingLevel = 1;
  isPublic = false;

  loading = signal(false);

  async submit() {
    this.loading.set(true);

    const { error } = await this.campaignStore.createCampaign({
      name: this.name,
      description: this.description,
      editionCode: this.editionCode,
      coverKey: this.coverKey,
      status: this.status,
      nextSessionAt: fromDatetimeLocalValue(this.nextSessionAtLocal),
      maxPlayers: this.maxPlayers,
      startingLevel: this.startingLevel,
      isPublic: this.isPublic,
    });

    if (error) {
      this.modal.error(error.message);
    } else {
      this.name = '';
      this.description = '';
      this.coverKey = CAMPAIGN_COVERS[0].key;
      this.status = 'active';
      this.nextSessionAtLocal = '';
      this.maxPlayers = null;
      this.startingLevel = 1;
      this.isPublic = false;
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  async deleteCampaign(campaignId: string, campaignName: string) {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_campaign')} "${campaignName}"?`
    );
    if (!confirmed) return;

    const { error } = await this.campaignStore.deleteCampaign(campaignId);
    if (error) {
      this.modal.error(error.message);
    }
  }
}
