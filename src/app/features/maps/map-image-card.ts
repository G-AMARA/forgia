import { Component, inject, input, output } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { MapAlbumImage } from '../../core/map-albums';

// Miniatura di una singola immagine dell'album, con didascalia modificabile inline
// (salvata al blur/invio) e bottone elimina.
@Component({
  selector: 'app-map-image-card',
  imports: [],
  templateUrl: './map-image-card.html',
})
export class MapImageCard {
  protected localeService = inject(LocaleService);

  readonly image = input.required<MapAlbumImage>();
  readonly canManage = input(false);

  readonly captionSave = output<string>();
  readonly delete = output<void>();
}
