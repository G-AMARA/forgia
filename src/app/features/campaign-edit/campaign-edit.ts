import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActiveCampaign, CampaignStatus } from '../../core/active-campaign';
import { AppNav } from '../../core/app-nav';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { CAMPAIGN_COVERS, getCoverImagePath } from '../../core/campaign-covers';
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../../core/datetime-local';

@Component({
  selector: 'app-campaign-edit',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './campaign-edit.html',
})
export class CampaignEdit implements OnInit {
  protected campaignStore = inject(ActiveCampaign);
  protected appNav = inject(AppNav);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  covers = CAMPAIGN_COVERS;
  getCoverImagePath = getCoverImagePath;

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

  loading = signal(false);

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
    }
  }

  async submit() {
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
    });

    if (error) {
      this.modal.error(error.message);
    } else {
      this.modal.success(this.localeService.t('saved_message'));
      this.appNav.setTab('hub');
    }

    this.loading.set(false);
  }

  async deleteCampaign() {
    const campaign = this.campaignStore.current();
    if (!campaign) return;

    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_campaign')} "${campaign.name}"?`
    );
    if (!confirmed) return;

    const { error } = await this.campaignStore.deleteCampaign(campaign.id);
    if (error) {
      this.modal.error(error.message);
    } else {
      this.appNav.setTab('board');
    }
  }
}
