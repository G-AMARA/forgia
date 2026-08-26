import { Injectable, inject, signal } from '@angular/core';
import { Supabase } from './supabase';

export interface MapAlbumImage {
  id: string;
  imageUrl: string;
  caption: string | null;
  position: number;
}

export interface MapAlbum {
  id: string;
  campaignId: string;
  name: string;
  images: MapAlbumImage[];
}

const ALBUM_COLUMNS = 'id, campaign_id, name, images:map_album_images(id, image_url, caption, position)';

function mapRow(row: any): MapAlbum {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    images: (row.images ?? [])
      .map((img: any) => ({ id: img.id, imageUrl: img.image_url, caption: img.caption, position: img.position }))
      .sort((a: MapAlbumImage, b: MapAlbumImage) => a.position - b.position),
  };
}

// Libreria di mappe/luoghi per campagna (campaign-hub, sezione "Mappe e luoghi"): album
// (es. "Taverna", "Foresta") contenenti più immagini, ognuna con una propria didascalia.
// Stesso pattern di BestiaryStore: signal aggiornato in locale dopo ogni mutazione,
// nessun reload completo salvo il caricamento iniziale.
@Injectable({ providedIn: 'root' })
export class MapAlbumsStore {
  private supabase = inject(Supabase);

  readonly albums = signal<MapAlbum[]>([]);
  readonly loading = signal(false);

  async loadAlbums(campaignId: string) {
    this.loading.set(true);

    const { data, error } = await this.supabase.client
      .from('map_albums')
      .select(ALBUM_COLUMNS)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })
      .order('position', { referencedTable: 'map_album_images', ascending: true });

    if (error) {
      console.error('Errore caricamento album mappe', error.message);
      this.albums.set([]);
      this.loading.set(false);
      return;
    }

    this.albums.set((data ?? []).map(mapRow));
    this.loading.set(false);
  }

  // Fetch mirato di una singola immagine per id, senza passare dall'albero completo degli
  // album (che un giocatore non carica mai: solo il Master apre "Mappe e luoghi"). Usato da
  // Play per idratare la mappa attiva persistita (campaigns.active_map_id) all'ingresso in
  // sessione. Nessun filtro implicito oltre l'id: è la RLS (vedi
  // sql/2026-08-26_map_albums_member_select.sql) a decidere chi vede cosa.
  async loadImageById(imageId: string): Promise<MapAlbumImage | null> {
    const { data, error } = await this.supabase.client
      .from('map_album_images')
      .select('id, image_url, caption, position')
      .eq('id', imageId)
      .maybeSingle();

    if (error) {
      console.error('Errore caricamento immagine mappa', { imageId, message: error.message, code: error.code });
      return null;
    }

    if (!data) {
      // PostgREST non segnala un errore quando la RLS filtra la riga a 0 risultati: da qui
      // non si distingue "id inesistente" da "permessi insufficienti", va verificato lato DB.
      console.error('Immagine mappa non trovata (id inesistente o RLS che filtra la riga)', { imageId });
      return null;
    }

    return { id: data.id, imageUrl: data.image_url, caption: data.caption, position: data.position };
  }

  async createAlbum(campaignId: string, name: string) {
    const { data, error } = await this.supabase.client
      .from('map_albums')
      .insert({ campaign_id: campaignId, name })
      .select(ALBUM_COLUMNS)
      .single();

    if (!error && data) {
      this.albums.update((list) => [...list, mapRow(data)]);
    }

    return { error };
  }

  async deleteAlbum(albumId: string) {
    const { error } = await this.supabase.client.from('map_albums').delete().eq('id', albumId);

    if (!error) {
      this.albums.update((list) => list.filter((a) => a.id !== albumId));
    }

    return { error };
  }

  // Carica il file su Storage (bucket "maps", una cartella per campagna) e restituisce
  // l'URL pubblico: stesso pattern di BestiaryStore.uploadMonsterImage.
  async uploadImage(campaignId: string, file: File) {
    const ext = file.name.split('.').pop();
    const path = `${campaignId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage.from('maps').upload(path, file, {
      upsert: true,
    });

    if (uploadError) {
      return { error: uploadError, url: null };
    }

    const { data } = this.supabase.client.storage.from('maps').getPublicUrl(path);
    return { error: null, url: data.publicUrl };
  }

  async addImage(albumId: string, imageUrl: string, caption: string) {
    const currentAlbum = this.albums().find((a) => a.id === albumId);
    const position = currentAlbum ? currentAlbum.images.length : 0;

    const { data, error } = await this.supabase.client
      .from('map_album_images')
      .insert({ album_id: albumId, image_url: imageUrl, caption: caption || null, position })
      .select('id, image_url, caption, position')
      .single();

    if (!error && data) {
      const image: MapAlbumImage = { id: data.id, imageUrl: data.image_url, caption: data.caption, position: data.position };
      this.albums.update((list) =>
        list.map((a) => (a.id === albumId ? { ...a, images: [...a.images, image] } : a))
      );
    }

    return { error };
  }

  async updateImageCaption(albumId: string, imageId: string, caption: string) {
    const { error } = await this.supabase.client
      .from('map_album_images')
      .update({ caption: caption || null })
      .eq('id', imageId);

    if (!error) {
      this.albums.update((list) =>
        list.map((a) =>
          a.id !== albumId
            ? a
            : { ...a, images: a.images.map((img) => (img.id === imageId ? { ...img, caption: caption || null } : img)) }
        )
      );
    }

    return { error };
  }

  async deleteImage(albumId: string, imageId: string) {
    const { error } = await this.supabase.client.from('map_album_images').delete().eq('id', imageId);

    if (!error) {
      this.albums.update((list) =>
        list.map((a) => (a.id !== albumId ? a : { ...a, images: a.images.filter((img) => img.id !== imageId) }))
      );
    }

    return { error };
  }
}
