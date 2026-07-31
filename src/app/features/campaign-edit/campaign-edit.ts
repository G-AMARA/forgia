import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActiveCampaign } from '../../core/active-campaign';
import { AppNav } from '../../core/app-nav';
import { LocaleService } from '../../core/locale';
import { CAMPAIGN_COVERS, getCoverImagePath } from '../../core/campaign-covers';

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

  covers = CAMPAIGN_COVERS;
  getCoverImagePath = getCoverImagePath;

  readonly maxDescriptionLength = 700;

  name = '';
  description = '';
  coverKey = '';

  errorMsg = signal<string | null>(null);
  loading = signal(false);

  ngOnInit() {
    const campaign = this.campaignStore.current();
    if (campaign) {
      this.name = campaign.name;
      this.description = campaign.description ?? '';
      this.coverKey = campaign.cover_key;
    }
  }

  async submit() {
    const campaign = this.campaignStore.current();
    if (!campaign) return;

    this.errorMsg.set(null);
    this.loading.set(true);

    const { error } = await this.campaignStore.updateCampaign(campaign.id, {
      name: this.name,
      description: this.description,
      coverKey: this.coverKey,
    });

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.appNav.setTab('hub');
    }

    this.loading.set(false);
  }

  async deleteCampaign() {
    const campaign = this.campaignStore.current();
    if (!campaign) return;

    const confirmed = window.confirm(
      `${this.localeService.t('confirm_delete_campaign')} "${campaign.name}"?`
    );
    if (!confirmed) return;

    const { error } = await this.campaignStore.deleteCampaign(campaign.id);
    if (!error) {
      this.appNav.setTab('board');
    }
  }
}
