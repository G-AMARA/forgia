import { Component, inject } from '@angular/core';
import { ActiveCampaign } from '../../core/active-campaign';
import { AppNav } from '../../core/app-nav';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { CampaignEditForm } from './campaign-edit-form';

// "Modifica Campagna": intestazione con rientro al Campaign Hub + form (CampaignEditForm) +
// Zona Pericolosa. L'eliminazione resta qui (non nel form) perché è un'azione distinta dal
// salvataggio, con la propria conferma via Modal.
@Component({
  selector: 'app-campaign-edit',
  standalone: true,
  imports: [CampaignEditForm],
  templateUrl: './campaign-edit.html',
})
export class CampaignEdit {
  protected campaignStore = inject(ActiveCampaign);
  protected appNav = inject(AppNav);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected goToHub() {
    this.appNav.setTab('hub');
  }

  protected async deleteCampaign() {
    const campaign = this.campaignStore.current();
    if (!campaign) return;

    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_campaign')} "${campaign.name}"?`,
      {
        cancelLabel: this.localeService.t('cancel_button'),
        confirmLabel: this.localeService.t('confirm_delete_button_confirm'),
      }
    );
    if (!confirmed) return;

    const { error } = await this.campaignStore.deleteCampaign(campaign.id);
    if (error) {
      this.modal.error(error.message);
      return;
    }

    await this.modal.success(
      `${this.localeService.t('campaign_deleted_msg_1')} "${campaign.name}" ${this.localeService.t('campaign_deleted_msg_2')}`
    );
    this.appNav.setTab('board');
  }
}
