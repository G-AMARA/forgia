import { Component, inject, input, output } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { MapAlbum } from '../../core/map-albums';

// Card di un album nella griglia (maps.html): copertina (prima immagine o placeholder),
// nome, conteggio immagini.
@Component({
  selector: 'app-map-album-card',
  imports: [],
  templateUrl: './map-album-card.html',
})
export class MapAlbumCard {
  protected localeService = inject(LocaleService);

  readonly album = input.required<MapAlbum>();
  readonly canManage = input(false);

  readonly open = output<void>();
  readonly delete = output<void>();
}
