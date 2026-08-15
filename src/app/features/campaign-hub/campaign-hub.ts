import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveCampaign } from '../../core/active-campaign';
import { CharacterStore } from '../../core/character-store';
import { Auth } from '../../core/auth';
import { AppNav } from '../../core/app-nav';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
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
  private modal = inject(Modal);
  private router = inject(Router);

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

  goToMyCharacter() {
    const userId = this.auth.user()?.id;
    const myCharacter = this.characterStore.characters().find((c) => c.owner_id === userId);
    if (!myCharacter) return;

    this.goToCharacterSheet(myCharacter.id);
  }

  // Apre la scheda di un personaggio del roster (proprio o altrui). Chi non è
  // il proprietario la vede in sola lettura: lo gestisce CharacterSheet stesso.
  goToCharacterSheet(characterId: string) {
    this.appNav.setTab('character-sheet');
    this.router.navigate(['/scheda-personaggio', characterId]);
  }

  async deleteCharacter(event: Event, characterId: string, characterName: string) {
    event.stopPropagation(); // evita che il click apra anche la scheda

    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_character')} "${characterName}"?!`,
      this.localeService.t('confirm_delete_character_title'),
      this.localeService.t('confirm_delete_button_confirm'),
      this.localeService.t('cancel_button'),
    );
    if (!confirmed) return;

    const { error } = await this.characterStore.deleteCharacter(characterId);
    if (error) {
      this.modal.error(error.message);
    }
  }

  goToManage() {
    this.appNav.setTab('campaign-edit');
  }
}
