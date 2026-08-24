import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { MapAlbum, MapAlbumImage, MapAlbumsStore } from '../../core/map-albums';
import { LocaleService } from '../../core/locale';

// Selezione della mappa attiva per la sessione, dentro la sezione "Mappe e luoghi" della
// colonna Master (Play). Stessi album di MapAlbumsStore già gestiti in Maps (hub), qui
// in sola lettura/selezione: niente creazione, upload o cancellazione, quelle restano lì.
@Component({
  selector: 'app-play-map-picker',
  standalone: true,
  templateUrl: './play-map-picker.html',
})
export class PlayMapPicker implements OnInit {
  protected mapAlbumsStore = inject(MapAlbumsStore);
  protected localeService = inject(LocaleService);

  readonly campaignId = input.required<string>();
  readonly activeImage = input<MapAlbumImage | null>(null);
  readonly selectImage = output<MapAlbumImage | null>();

  private expandedAlbumId = signal<string | null>(null);

  protected expandedAlbum = computed<MapAlbum | null>(
    () => this.mapAlbumsStore.albums().find((a) => a.id === this.expandedAlbumId()) ?? null
  );

  ngOnInit() {
    this.mapAlbumsStore.loadAlbums(this.campaignId());
  }

  toggleAlbum(albumId: string) {
    this.expandedAlbumId.set(this.expandedAlbumId() === albumId ? null : albumId);
  }

  choose(image: MapAlbumImage) {
    this.selectImage.emit(image);
  }

  clear() {
    this.selectImage.emit(null);
  }
}
