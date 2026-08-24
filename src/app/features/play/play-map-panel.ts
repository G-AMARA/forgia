import { Component, inject, input } from '@angular/core';
import { MapAlbumImage } from '../../core/map-albums';
import { LocaleService } from '../../core/locale';

// Colonna destra della pagina "Gioca": mostra a piena colonna la mappa scelta dal Master
// (vedi PlayMapPicker, dentro PlayMasterPanel > "Mappe e luoghi"). Solo visualizzazione,
// nessuna logica di selezione qui.
@Component({
  selector: 'app-play-map-panel',
  standalone: true,
  templateUrl: './play-map-panel.html',
})
export class PlayMapPanel {
  protected localeService = inject(LocaleService);

  readonly canManage = input(false);
  readonly activeImage = input<MapAlbumImage | null>(null);
}
