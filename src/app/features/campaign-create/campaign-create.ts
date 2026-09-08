import { Component, inject } from '@angular/core';
import { ActiveCampaign } from '../../core/active-campaign';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { CampaignCard } from './campaign-card';
import { CampaignCreateForm } from './campaign-create-form';

// "Le tue campagne": griglia delle campagne del Master (CampaignCard) + form di creazione
// (CampaignCreateForm, solo Master). La selezione/eliminazione restano qui perché richiedono
// ActiveCampaign e Modal, condivisi tra tutte le card della griglia.
@Component({
  selector: 'app-campaign-create',
  standalone: true,
  imports: [CampaignCard, CampaignCreateForm],
  templateUrl: './campaign-create.html',
})
export class CampaignCreate {
  protected campaignStore = inject(ActiveCampaign);
  protected auth = inject(Auth);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected async deleteCampaign(campaignId: string, campaignName: string) {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_campaign')}` + `"${campaignName}"?`,
      {
        confirmLabel: this.localeService.t('confirm_delete_button_confirm'),
        cancelLabel: this.localeService.t('cancel_button'),
      }
    );
    if (!confirmed) return;

    const { error } = await this.campaignStore.deleteCampaign(campaignId);
    if (error) {
      this.modal.error(error.message);
      return;
    }

    await this.modal.success(
      `${this.localeService.t('campaign_deleted_msg_1')} "${campaignName}" ${this.localeService.t('campaign_deleted_msg_2')}`
    );
  }
}
