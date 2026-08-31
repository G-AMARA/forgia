import { Injectable, inject, signal } from '@angular/core';
import { Supabase } from '../../core/supabase';

export interface FogRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FogOp = { type: 'reveal' | 'cover'; rect: FogRect };

export interface FogState {
  operations: FogOp[];
}

// Stato della nebbia per la mappa attiva: UNA lista ordinata di operazioni (non due liste
// separate revealed/covered), in coordinate mondo (stesso spazio di token.x/y). Rese nella
// stessa sequenza in cui sono state disegnate (vedi FogOfWarComponent, che le itera in
// ordine in un'unica <mask>): l'operazione più recente che tocca un punto vince sempre,
// che sia "copri" o "scopri" — a differenza del vecchio modello a due liste, dove "copri"
// vinceva sempre su "scopri" indipendentemente dall'ordine reale delle azioni (bug: un'area
// coperta non poteva più essere ri-scoperta).
// Persistito come stato unico per (campaign_id, map_image_id), non una riga per rettangolo
// (vedi sql/2026-08-26_map_fog_state.sql): reveal/cover restano semplici append, nessuna
// geometria (unione/sottrazione) lato SQL o lato client.
@Injectable({ providedIn: 'root' })
export class FogOfWarStore {
  private supabase = inject(Supabase);

  readonly operations = signal<FogOp[]>([]);

  // Incrementato a ogni load(): una risposta di rete in arrivo per una richiesta non più
  // "corrente" (superata da un load() più recente, es. cambio rapido di mappa in ingresso
  // sessione) viene scartata invece di sovrascrivere uno stato più recente e corretto.
  private requestSeq = 0;

  async load(campaignId: string, mapImageId: string) {
    const requestId = ++this.requestSeq;
    // Azzera subito, prima della risposta: meglio un istante "tutto coperto" (fail-safe)
    // che rischiare di mostrare per uno o più frame lo stato della mappa precedente.
    this.operations.set([]);

    const { data, error } = await this.supabase.client
      .from('map_fog_state')
      .select('operations')
      .eq('campaign_id', campaignId)
      .eq('map_image_id', mapImageId)
      .maybeSingle();

    if (requestId !== this.requestSeq) return;

    if (error) {
      console.error('Errore caricamento nebbia', error.message);
      this.operations.set([]);
      return;
    }

    this.operations.set((data?.operations as FogOp[] | undefined) ?? []);
  }

  clear() {
    this.requestSeq++;
    this.operations.set([]);
  }

  reveal(rect: FogRect): FogState {
    this.operations.update((list) => [...list, { type: 'reveal', rect }]);
    return this.snapshot();
  }

  cover(rect: FogRect): FogState {
    this.operations.update((list) => [...list, { type: 'cover', rect }]);
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
    this.operations.set(state.operations);
  }

  isRevealedAt(x: number, y: number): boolean {
    const ops = this.operations();
    for (let i = ops.length - 1; i >= 0; i--) {
      const { type, rect } = ops[i];
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
        return type === 'reveal';
      }
    }
    return false;
  }

  private snapshot(): FogState {
    return { operations: this.operations() };
  }

  async save(campaignId: string, mapImageId: string, state: FogState) {
    const { error } = await this.supabase.client.from('map_fog_state').upsert(
      {
        campaign_id: campaignId,
        map_image_id: mapImageId,
        operations: state.operations,
      },
      { onConflict: 'campaign_id,map_image_id' }
    );

    if (error) {
      console.error('Errore salvataggio nebbia', error.message);
    }
  }
}
