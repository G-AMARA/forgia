import { Component, Input, inject } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

// Elenco dei cloni in campagna di un PG base della Fucina (vedi
// CharacterStore.cloneCharacterToCampaign), con l'azione "Aggiorna dalla campagna X"
// (CharacterStore.pullFromCampaignClone): una copia manuale una tantum dello stato
// attuale del clone dentro il base, non un collegamento continuo.
@Component({
  selector: 'app-forge-clones-panel',
  standalone: true,
  templateUrl: './forge-clones-panel.html',
})
export class ForgeClonesPanel {
  protected characterStore = inject(CharacterStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  @Input({ required: true }) baseId!: string;

  protected clones() {
    return this.characterStore.clonesOfTemplate(this.baseId);
  }

  protected async pull(cloneId: string, campaignName: string | null) {
    const label = campaignName ?? '?';
    const confirmed = await this.modal.confirm(`${this.localeService.t('pull_from_campaign_confirm')} "${label}"?`);
    if (!confirmed) return;

    const { error } = await this.characterStore.pullFromCampaignClone(this.baseId, cloneId);
    if (error) {
      this.modal.error(error.message);
    }
  }
}
