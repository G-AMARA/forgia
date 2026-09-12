import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { MapAlbum, MapAlbumsStore } from '../../core/map-albums';
import { MapImageCard } from './map-image-card';

// Vista di dettaglio di un album: griglia delle immagini con didascalia, form per
// caricarne una nuova (file + didascalia opzionale). Il visualizzatore a schermo intero
// per sfogliare le immagini durante una sessione è un componente futuro, non ancora
// progettato: qui c'è solo la gestione della libreria.
@Component({
  selector: 'app-map-album-detail',
  imports: [FormsModule, MapImageCard],
  templateUrl: './map-album-detail.html',
})
export class MapAlbumDetail {
  protected mapAlbumsStore = inject(MapAlbumsStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  readonly album = input.required<MapAlbum>();
  readonly canManage = input(false);
  readonly back = output<void>();

  // Il template non risolve i globali JS: serve esposto per nascondere la quota quando il
  // rango è Fato (MapAlbumsStore.myMapImageLimit()), come Npc.Infinity.
  protected readonly Infinity = Infinity;

  protected uploading = signal(false);
  protected captionDraft = '';

  async onFileSelected(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    // Il limite vero è imposto lato RLS (get_campaign_addition_limit su
    // map_album_images): questo controllo evita solo un errore di permessi poco chiaro se
    // la quota si è esaurita nel frattempo, e soprattutto evita di sprecare un upload su
    // Storage per un'immagine che poi l'insert rifiuterebbe comunque.
    if (!this.mapAlbumsStore.canAddMapImage()) {
      this.modal.error(this.localeService.t('map_quota_reached_hint'));
      fileInput.value = '';
      return;
    }

    this.uploading.set(true);

    const { error: uploadError, url } = await this.mapAlbumsStore.uploadImage(this.album().campaignId, file);
    if (uploadError || !url) {
      this.modal.error(uploadError?.message ?? 'Errore di caricamento');
      this.uploading.set(false);
      fileInput.value = '';
      return;
    }

    const { error } = await this.mapAlbumsStore.addImage(this.album().id, url, this.captionDraft);
    if (error) this.modal.error(error.message);

    this.captionDraft = '';
    this.uploading.set(false);
    fileInput.value = '';
  }

  saveCaption(imageId: string, caption: string) {
    this.mapAlbumsStore.updateImageCaption(this.album().id, imageId, caption);
  }

  async deleteImage(imageId: string) {
    const confirmed = await this.modal.confirm(this.localeService.t('confirm_delete_image'));
    if (!confirmed) return;

    const { error } = await this.mapAlbumsStore.deleteImage(this.album().id, imageId);
    if (error) this.modal.error(error.message);
  }
}
