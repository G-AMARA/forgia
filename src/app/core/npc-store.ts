import { Injectable, inject, signal } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';

export type NpcAttitude = 'friendly' | 'neutral' | 'hostile';

export interface NpcCharacter {
  id: string;
  name: string;
  title: string | null;
  location: string | null;
  attitude: NpcAttitude | null;
  description: string | null;
  image_url: string | null;
}

// I PNG sono un catalogo globale (come il Bestiario, vedi BestiaryStore), gestito da
// Gestione > PNG. Ogni campagna sceglie un sottoinsieme da mostrare nel proprio pannello
// (tabella ponte campaign_npc_characters): "catalog" e "selectedIds" restano due signal
// separati, combinati dal chiamante (Npc component filtra catalog() con selectedIds()).
@Injectable({ providedIn: 'root' })
export class NpcStore {
  private supabase = inject(Supabase);
  private auth = inject(Auth);

  readonly catalog = signal<NpcCharacter[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly loading = signal(false);

  async loadCatalog() {
    this.loading.set(true);

    const { data, error } = await this.supabase.client
      .from('npc_characters')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Errore caricamento catalogo PNG', error.message);
      this.catalog.set([]);
      this.loading.set(false);
      return;
    }

    this.catalog.set(data ?? []);
    this.loading.set(false);
  }

  async loadSelectionForCampaign(campaignId: string) {
    const { data, error } = await this.supabase.client
      .from('campaign_npc_characters')
      .select('npc_id')
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Errore caricamento selezione PNG campagna', error.message);
      this.selectedIds.set(new Set());
      return;
    }

    this.selectedIds.set(new Set((data ?? []).map((row) => row.npc_id)));
  }

  async createNpc(payload: Omit<NpcCharacter, 'id'>) {
    const userId = this.auth.user()?.id;
    if (!userId) return { error: { message: 'Utente non autenticato' } };

    const { error } = await this.supabase.client.from('npc_characters').insert({
      ...payload,
      created_by: userId,
    });

    if (!error) {
      await this.loadCatalog();
    }

    return { error };
  }

  async updateNpc(id: string, payload: Partial<NpcCharacter>) {
    // .update() senza .select() non segnala nulla se la RLS blocca la riga: PostgREST
    // risponde "successo, 0 righe toccate" senza errore. Il .select() forza a scoprirlo
    // (stesso guard usato in BestiaryStore.updateMonster).
    const { data, error } = await this.supabase.client
      .from('npc_characters')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) return { error };
    if (!data || data.length === 0) {
      return { error: { message: 'PNG non aggiornato: controlla i permessi (RLS) su npc_characters.' } };
    }

    await this.loadCatalog();
    return { error: null };
  }

  async deleteNpc(id: string) {
    const { data, error } = await this.supabase.client
      .from('npc_characters')
      .delete()
      .eq('id', id)
      .select();

    if (error) return { error };
    if (!data || data.length === 0) {
      return { error: { message: 'PNG non eliminato: controlla i permessi (RLS) su npc_characters.' } };
    }

    await this.loadCatalog();
    return { error: null };
  }

  async uploadNpcImage(file: File) {
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('npcs')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      return { error: uploadError };
    }

    const { data } = this.supabase.client.storage.from('npcs').getPublicUrl(path);
    return { error: null, url: data.publicUrl };
  }

  async addToCampaign(campaignId: string, npcId: string) {
    const { error } = await this.supabase.client
      .from('campaign_npc_characters')
      .insert({ campaign_id: campaignId, npc_id: npcId });

    if (!error) {
      this.selectedIds.update((ids) => new Set(ids).add(npcId));
    }

    return { error };
  }

  async removeFromCampaign(campaignId: string, npcId: string) {
    const { error } = await this.supabase.client
      .from('campaign_npc_characters')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('npc_id', npcId);

    if (!error) {
      this.selectedIds.update((ids) => {
        const next = new Set(ids);
        next.delete(npcId);
        return next;
      });
    }

    return { error };
  }
}
