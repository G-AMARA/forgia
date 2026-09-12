import { Injectable, inject, signal, computed } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';
import { getCampaignAdditionLimitForSeconds } from './ranks';

export type NpcAttitude = 'friendly' | 'neutral' | 'hostile';

export interface NpcCharacter {
  id: string;
  name: string;
  title: string | null;
  location: string | null;
  attitude: NpcAttitude | null;
  description: string | null;
  image_url: string | null;
  created_by: string | null;
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

  // Quota di PNG auto-creati (Npc.openCreateForm) in base al rango araldico dell'utente
  // corrente (vedi core/ranks.ts): il conteggio è globale, non per campagna, perché il
  // catalogo PNG stesso è globale. Rispecchia il limite applicato lato RLS
  // (get_npc_creation_limit), qui solo per la UI (disabilitare il bottone in anticipo).
  readonly myNpcLimit = computed(() => getCampaignAdditionLimitForSeconds(this.auth.navigationSeconds(), this.auth.isAdmin()));
  readonly myNpcCount = computed(() => {
    const userId = this.auth.user()?.id;
    return userId ? this.catalog().filter((n) => n.created_by === userId).length : 0;
  });
  // Limite GLOBALE (sopra): protegge il catalogo condiviso da un utente che ne crea troppi
  // in totale, sommando su tutte le sue campagne. Non basta da solo: un utente sotto quella
  // soglia globale potrebbe comunque collegare PNG illimitati a UNA campagna pescandoli dal
  // catalogo (Npc.openPicker/NpcPicker.toggle), aggirando di fatto il senso della quota.
  // myNpcCampaignCount è quindi il conteggio PER QUESTA campagna (selectedIds riflette solo
  // la campagna caricata, vedi loadSelectionForCampaign), stessa logica di
  // BestiaryStore.myBestiaryCount/MapAlbumsStore.myMapCount: entrambi i limiti vanno
  // rispettati, sia per "Crea PNG" (NpcForm.submit) sia per "Seleziona PNG" (NpcPicker.toggle).
  readonly myNpcCampaignCount = computed(() => this.selectedIds().size);
  readonly canCreateNpc = computed(() => this.myNpcCount() < this.myNpcLimit());
  readonly canAddNpcToCampaign = computed(() => this.myNpcCampaignCount() < this.myNpcLimit());

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

  // campaignId: quando il PNG nasce dal tab PNG di una campagna (invece che da Gestione >
  // PNG), lo collega subito a quella campagna (campaign_npc_characters) così compare senza
  // dover passare dal picker, riservato a owner/admin.
  async createNpc(payload: Omit<NpcCharacter, 'id' | 'created_by'>, campaignId?: string) {
    const userId = this.auth.user()?.id;
    if (!userId) return { error: { message: 'Utente non autenticato' } };

    const { data, error } = await this.supabase.client
      .from('npc_characters')
      .insert({ ...payload, created_by: userId })
      .select()
      .single();

    if (error) return { error };

    await this.loadCatalog();

    if (campaignId) {
      const { error: linkError } = await this.addToCampaign(campaignId, data.id);
      if (linkError) return { error: linkError };
    }

    return { error: null };
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
