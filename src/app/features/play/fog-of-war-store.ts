import { Injectable, inject, signal } from '@angular/core';
import { Supabase } from '../../core/supabase';

export interface FogRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FogState {
  revealed: FogRect[];
  covered: FogRect[];
}

function containsPoint(rects: FogRect[], x: number, y: number): boolean {
  return rects.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

// Stato della nebbia per la mappa attiva: due liste separate in coordinate mondo (stesso
// spazio di token.x/y). revealedAreas svela, coveredAreas ri-copre SOPRA una rivelazione —
// nella <mask> di FogOfWarComponent i coveredAreas sono disegnati DOPO i revealedAreas,
// quindi ritagliano con precisione solo la porzione toccata invece di rimuovere l'intero
// rettangolo rivelato sottostante (bugfix: la versione precedente teneva un solo array e
// "coprire" cancellava per intero ogni rettangolo intersecato).
// Persistito come stato unico per (campaign_id, map_image_id), non una riga per rettangolo
// (vedi sql/2026-08-26_map_fog_state.sql): reveal/cover restano semplici append, nessuna
// geometria (unione/sottrazione) lato SQL o lato client.
@Injectable({ providedIn: 'root' })
export class FogOfWarStore {
  private supabase = inject(Supabase);

  readonly revealedAreas = signal<FogRect[]>([]);
  readonly coveredAreas = signal<FogRect[]>([]);

  async load(campaignId: string, mapImageId: string) {
    const { data, error } = await this.supabase.client
      .from('map_fog_state')
      .select('revealed_areas, covered_areas')
      .eq('campaign_id', campaignId)
      .eq('map_image_id', mapImageId)
      .maybeSingle();

    if (error) {
      console.error('Errore caricamento nebbia', error.message);
      this.clear();
      return;
    }

    this.revealedAreas.set((data?.revealed_areas as FogRect[] | undefined) ?? []);
    this.coveredAreas.set((data?.covered_areas as FogRect[] | undefined) ?? []);
  }

  clear() {
    this.revealedAreas.set([]);
    this.coveredAreas.set([]);
  }

  reveal(rect: FogRect): FogState {
    this.revealedAreas.update((list) => [...list, rect]);
    return this.snapshot();
  }

  cover(rect: FogRect): FogState {
    this.coveredAreas.update((list) => [...list, rect]);
    return this.snapshot();
  }

  reset(): FogState {
    this.clear();
    return this.snapshot();
  }

  // Applica uno stato ricevuto via broadcast: nessuna scrittura DB (chi ha disegnato l'ha
  // già persistita con save()) e nessun segnale "modifica locale" verso FogDrawing, per non
  // ribroadcastare in eco quanto appena ricevuto.
  setLocal(state: FogState) {
    this.revealedAreas.set(state.revealed);
    this.coveredAreas.set(state.covered);
  }

  isRevealedAt(x: number, y: number): boolean {
    return containsPoint(this.revealedAreas(), x, y) && !containsPoint(this.coveredAreas(), x, y);
  }

  private snapshot(): FogState {
    return { revealed: this.revealedAreas(), covered: this.coveredAreas() };
  }

  async save(campaignId: string, mapImageId: string, state: FogState) {
    const { error } = await this.supabase.client.from('map_fog_state').upsert(
      {
        campaign_id: campaignId,
        map_image_id: mapImageId,
        revealed_areas: state.revealed,
        covered_areas: state.covered,
      },
      { onConflict: 'campaign_id,map_image_id' }
    );

    if (error) {
      console.error('Errore salvataggio nebbia', error.message);
    }
  }
}
