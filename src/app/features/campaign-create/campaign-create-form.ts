import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActiveCampaign, CampaignStatus } from '../../core/active-campaign';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { CAMPAIGN_COVERS } from '../../core/campaign-covers';
import { fromDatetimeLocalValue } from '../../core/datetime-local';
import { CampaignCoverPicker } from '../../shared/campaign-cover-picker/campaign-cover-picker';

// Form "Crea una nuova campagna" (solo Master, vedi CampaignCreate). Gestisce da sé il
// proprio submit/reset: nessun output verso il genitore, a differenza di
// CharacterCreateForm, perché qui non c'è nulla da selezionare subito dopo la creazione.
@Component({
  selector: 'app-campaign-create-form',
  standalone: true,
  imports: [FormsModule, CampaignCoverPicker],
  templateUrl: './campaign-create-form.html',
})
export class CampaignCreateForm {
  private campaignStore = inject(ActiveCampaign);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  readonly maxDescriptionLength = 700;
  readonly statuses: CampaignStatus[] = ['active', 'paused', 'completed'];

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

  protected togglePublic() {
    this.isPublic = !this.isPublic;
  }

  protected async submit() {
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
      this.resetForm();
      this.modal.success(this.localeService.t('well_created_campaign'));
    }

    this.loading.set(false);
  }

  private resetForm() {
    this.name = '';
    this.description = '';
    this.coverKey = CAMPAIGN_COVERS[0].key;
    this.status = 'active';
    this.nextSessionAtLocal = '';
    this.maxPlayers = null;
    this.startingLevel = 1;
    this.isPublic = false;
  }
}
