import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActiveCampaign, CampaignStatus } from '../../core/active-campaign';
import { Auth, AdminProfile } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../../core/datetime-local';
import { CampaignCoverPicker } from '../../shared/campaign-cover-picker/campaign-cover-picker';
import { CampaignSettingsPanel } from '../../shared/campaign-settings-panel/campaign-settings-panel';

// Form "Modifica campagna" (CampaignEdit): non naviga da sé, emette saved/cancelled e lascia
// al genitore decidere dove andare (torna al Campaign Hub in entrambi i casi, vedi
// CampaignEdit.goToHub), stesso pattern di CharacterCreateForm.
@Component({
  selector: 'app-campaign-edit-form',
  standalone: true,
  imports: [FormsModule, CampaignCoverPicker, CampaignSettingsPanel],
  templateUrl: './campaign-edit-form.html',
})
export class CampaignEditForm implements OnInit {
  private campaignStore = inject(ActiveCampaign);
  protected auth = inject(Auth);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  readonly maxDescriptionLength = 700;
  readonly statuses: CampaignStatus[] = ['active', 'paused', 'completed'];

  name = '';
  description = '';
  coverKey = '';
  status: CampaignStatus = 'active';
  nextSessionAtLocal = '';
  maxPlayers: number | null = null;
  startingLevel = 1;
  isPublic = false;
  ownerId = '';

  loading = signal(false);
  // Popolato solo per admin (vedi ngOnInit): un owner normale non riassegna il Game Master.
  gmOptions = signal<AdminProfile[]>([]);

  ngOnInit() {
    const campaign = this.campaignStore.current();
    if (campaign) {
      this.name = campaign.name;
      this.description = campaign.description ?? '';
      this.coverKey = campaign.cover_key;
      this.status = campaign.status;
      this.nextSessionAtLocal = toDatetimeLocalValue(campaign.next_session_at);
      this.maxPlayers = campaign.max_players;
      this.startingLevel = campaign.starting_level;
      this.isPublic = campaign.is_public;
      this.ownerId = campaign.owner_id ?? '';
    }

    if (this.auth.isAdmin()) {
      this.loadGmOptions();
    }
  }

  protected togglePublic() {
    this.isPublic = !this.isPublic;
  }

  protected cancel() {
    this.cancelled.emit();
  }

  protected async submit() {
    const campaign = this.campaignStore.current();
    if (!campaign) return;

    this.loading.set(true);

    const { error } = await this.campaignStore.updateCampaign(campaign.id, {
      name: this.name,
      description: this.description,
      coverKey: this.coverKey,
      status: this.status,
      nextSessionAt: fromDatetimeLocalValue(this.nextSessionAtLocal),
      maxPlayers: this.maxPlayers,
      startingLevel: this.startingLevel,
      isPublic: this.isPublic,
      ownerId: this.ownerId || campaign.owner_id!,
    });

    this.loading.set(false);

    if (error) {
      this.modal.error(error.message);
      return;
    }

    await this.modal.success(this.localeService.t('well_updated_campaign'));
    this.saved.emit();
  }

  private async loadGmOptions() {
    const { data } = await this.auth.listProfiles();
    this.gmOptions.set(data);
  }
}
