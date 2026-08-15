import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActiveCampaign } from '../../core/active-campaign';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { CAMPAIGN_COVERS, getCoverImagePath } from '../../core/campaign-covers';

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

  covers = CAMPAIGN_COVERS;
  getCoverImagePath = getCoverImagePath;

  name = '';
  description = '';
  editionCode = '5e-2014';
  coverKey = CAMPAIGN_COVERS[0].key;

  loading = signal(false);

  async submit() {
    this.loading.set(true);

    const { error } = await this.campaignStore.createCampaign(
      this.name,
      this.description,
      this.editionCode,
      this.coverKey
    );

    if (error) {
      this.modal.error(error.message);
    } else {
      this.name = '';
      this.description = '';
      this.coverKey = CAMPAIGN_COVERS[0].key;
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  async deleteCampaign(campaignId: string, campaignName: string) {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_campaign')}` + `"${campaignName}"?`,
      `${this.localeService.t('confirm_delete_campaign_title')}`,
      `${this.localeService.t('confirm_delete_button_confirm')}`,
      `${this.localeService.t('cancel_button')}`,
      
    );
    console.log('Delete campaign confirmed:', confirmed);
    if (!confirmed) return;

    const { error } = await this.campaignStore.deleteCampaign(campaignId);
    if (error) {
      this.modal.error(error.message);
    }
  }
}
