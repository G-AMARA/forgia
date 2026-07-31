import { Component, inject } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { ActiveCampaign } from '../../core/active-campaign';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-character-list',
  standalone: true,
  templateUrl: './character-list.html',
})
export class CharacterList {
  protected characterStore = inject(CharacterStore);
  protected campaignStore = inject(ActiveCampaign);
  protected auth = inject(Auth);
  protected localeService = inject(LocaleService);

  async deleteCharacter(event: Event, characterId: string, characterName: string) {
    event.stopPropagation();

    const confirmed = window.confirm(
      `${this.localeService.t('confirm_delete_character')} "${characterName}"?`
    );
    if (!confirmed) return;

    await this.characterStore.deleteCharacter(characterId);
  }
}
