import { Component, inject, input, output, signal } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { MapAlbumImage } from '../../core/map-albums';
import { Bestiary } from '../bestiary/bestiary';
import { PlayMapPicker } from './play-map-picker';

type MasterSection = 'session-log' | 'bestiary' | 'maps';

// Colonna sinistra della pagina "Gioca" per il Master: le informazioni della campagna,
// stesso accordion "Bestiario"/"Mappe e luoghi" già presente nella hub (CampaignHub),
// qui estratto per stare nella colonna stretta della pagina di gioco. In "Mappe e luoghi"
// si sceglie anche la mappa attiva per la sessione (vedi PlayMapPicker), non solo si
// gestiscono gli album come nella hub.
@Component({
  selector: 'app-play-master-panel',
  standalone: true,
  imports: [Bestiary, PlayMapPicker],
  templateUrl: './play-master-panel.html',
})
export class PlayMasterPanel {
  protected localeService = inject(LocaleService);

  readonly campaignId = input.required<string>();
  readonly activeImage = input<MapAlbumImage | null>(null);
  readonly selectImage = output<MapAlbumImage | null>();

  protected expandedSection = signal<MasterSection | null>(null);

  toggleSection(section: MasterSection) {
    this.expandedSection.set(this.expandedSection() === section ? null : section);
  }
}
