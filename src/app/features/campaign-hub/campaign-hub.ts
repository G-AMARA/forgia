import { Component, inject, computed } from '@angular/core';
import { ActiveCampaign } from '../../core/active-campaign';
import { CharacterStore } from '../../core/character-store';
import { Auth } from '../../core/auth';
import { AppNav } from '../../core/app-nav';
import { LocaleService } from '../../core/locale';
import { getCover, getCoverImagePath } from '../../core/campaign-covers';

@Component({
  selector: 'app-campaign-hub',
  standalone: true,
  templateUrl: './campaign-hub.html',
})
export class CampaignHub {
  protected campaignStore = inject(ActiveCampaign);
  protected characterStore = inject(CharacterStore);
  protected auth = inject(Auth);
  protected appNav = inject(AppNav);
  protected localeService = inject(LocaleService);

  cover = computed(() => {
    const campaign = this.campaignStore.current();
    return campaign ? getCover(campaign.cover_key) : null;
  });

  getCoverImagePath = getCoverImagePath;

  isOwner = computed(() => {
    const campaign = this.campaignStore.current();
    const userId = this.auth.user()?.id;
    return !!campaign && !!userId && campaign.owner_id === userId;
  });

  hasOwnCharacter = computed(() => {
    const userId = this.auth.user()?.id;
    if (!userId) return false;
    return this.characterStore.characters().some((c) => c.owner_id === userId);
  });

  goToCharacters() {
    this.appNav.setTab('characters');
  }

  goToManage() {
    this.appNav.setTab('campaign-edit');
  }
}
