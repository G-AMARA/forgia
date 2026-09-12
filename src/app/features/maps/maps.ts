import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MapAlbum, MapAlbumsStore } from '../../core/map-albums';
import { Auth } from '../../core/auth';
import { ActiveCampaign } from '../../core/active-campaign';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { MapAlbumCard } from './map-album-card';
import { MapAlbumDetail } from './map-album-detail';

// Libreria di mappe/luoghi (campaign-hub, sezione "Mappe e luoghi"): griglia di album,
// creazione di nuovi album, e il dettaglio dell'album selezionato (immagini + didascalie).
@Component({
  selector: 'app-maps',
  imports: [FormsModule, MapAlbumCard, MapAlbumDetail],
  templateUrl: './maps.html',
})
export class Maps implements OnInit {
  protected mapAlbumsStore = inject(MapAlbumsStore);
  private auth = inject(Auth);
  private activeCampaign = inject(ActiveCampaign);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  readonly campaignId = input.required<string>();

  // Ricalcolato qui invece di fidarsi di un booleano passato dal parent, stessa logica
  // di Bestiary.canManage.
  protected canManage = computed(() => {
    const campaign = this.activeCampaign.current();
    const userId = this.auth.user()?.id;
    return (!!campaign && !!userId && campaign.owner_id === userId) || this.auth.isAdmin();
  });

  protected newAlbumName = '';
  private selectedAlbumId = signal<string | null>(null);

  protected selectedAlbum = computed<MapAlbum | null>(
    () => this.mapAlbumsStore.albums().find((a) => a.id === this.selectedAlbumId()) ?? null
  );

  ngOnInit() {
    this.mapAlbumsStore.loadAlbums(this.campaignId());
  }

  selectAlbum(albumId: string) {
    this.selectedAlbumId.set(albumId);
  }

  closeAlbum() {
    this.selectedAlbumId.set(null);
  }

  // Creare un album non ha un tetto: è solo un contenitore organizzativo, la quota vale
  // sulle IMMAGINI (vedi MapAlbumDetail.onFileSelected/MapAlbumsStore.canAddMapImage).
  async createAlbum() {
    const name = this.newAlbumName.trim();
    if (!name) return;

    const { error } = await this.mapAlbumsStore.createAlbum(this.campaignId(), name);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    this.newAlbumName = '';
  }

  async deleteAlbum(albumId: string, name: string) {
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_delete_album')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.mapAlbumsStore.deleteAlbum(albumId);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    if (this.selectedAlbum()?.id === albumId) this.selectedAlbumId.set(null);
  }
}
