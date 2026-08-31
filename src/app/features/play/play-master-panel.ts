import { Component, inject, input, output, signal } from '@angular/core';
import { CampaignTokens } from '../../core/campaign-tokens';
import { LocaleService } from '../../core/locale';
import { MapAlbumImage } from '../../core/map-albums';
import { Modal } from '../../core/modal';
import { Bestiary } from '../bestiary/bestiary';
import { Npc } from '../npc/npc';
import { PlayMapPicker } from './play-map-picker';

type MasterSection = 'npc' | 'bestiary' | 'maps';

// Colonna sinistra della pagina "Gioca" per il Master: le informazioni della campagna,
// stesso accordion "PNG"/"Bestiario"/"Mappe e luoghi" già presente nella hub
// (CampaignHub), qui estratto per stare nella colonna stretta della pagina di gioco. In
// "Mappe e luoghi" si sceglie anche la mappa attiva per la sessione (vedi PlayMapPicker),
// non solo si gestiscono gli album come nella hub.
@Component({
  selector: 'app-play-master-panel',
  standalone: true,
  imports: [Bestiary, Npc, PlayMapPicker],
  templateUrl: './play-master-panel.html',
})
export class PlayMasterPanel {
  private campaignTokens = inject(CampaignTokens);
  private modal = inject(Modal);
  protected localeService = inject(LocaleService);

  readonly campaignId = input.required<string>();
  readonly activeImage = input<MapAlbumImage | null>(null);
  readonly selectImage = output<MapAlbumImage | null>();
  readonly tokensChanged = output<void>();

  protected expandedSection = signal<MasterSection | null>(null);

  toggleSection(section: MasterSection) {
    this.expandedSection.set(this.expandedSection() === section ? null : section);
  }

  // Rimuove in un click tutti i mostri/PNG dalla plancia (mai i PG, piazzati dai
  // giocatori): pensato per lo svuotamento rapido prima di cambiare mappa, senza dover
  // rimuovere ogni pedina una alla volta dal menu contestuale.
  async clearMonstersAndNpcs() {
    const confirmed = await this.modal.confirm(this.localeService.t('play_clear_tokens_confirm'), {
      confirmLabel: this.localeService.t('confirm_delete_button_confirm'),
      cancelLabel: this.localeService.t('cancel_button'),
    });
    if (!confirmed) return;

    const removed = await this.campaignTokens.removeMonstersAndNpcs(this.campaignId());
    if (removed > 0) this.tokensChanged.emit();
  }
}
