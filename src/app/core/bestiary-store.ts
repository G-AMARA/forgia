import { Injectable, inject, signal, computed } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';
import { getCampaignAdditionLimitForSeconds } from './ranks';

export interface TraitBlock {
  name: string;
  description: string;
}

export interface BestiaryMonster {
  id: string;
  name: string;
  size: string | null;
  type: string | null;
  alignment: string | null;
  armor_class: string | null;
  hit_points: string | null;
  speed: string | null;
  str: number | null;
  dex: number | null;
  con: number | null;
  intelligence: number | null;
  wis: number | null;
  cha: number | null;
  saving_throws: string | null;
  skills: string | null;
  damage_vulnerabilities: string | null;
  damage_resistances: string | null;
  damage_immunities: string | null;
  condition_immunities: string | null;
  senses: string | null;
  languages: string | null;
  challenge_rating: string | null;
  experience_points: number | null;
  special_traits: TraitBlock[];
  actions: TraitBlock[];
  bonus_actions: TraitBlock[];
  reactions: TraitBlock[];
  legendary_actions: TraitBlock[];
  lair_actions: TraitBlock[];
  regional_effects: TraitBlock[];
  image_url: string | null;
}

// Il bestiario è un catalogo globale (come races/spells/weapons), gestito da Gestione >
// Bestiario. Ogni campagna sceglie un sottoinsieme di quel catalogo da mostrare nel
// proprio carosello (tabella ponte campaign_bestiary_monsters): "catalog" e
// "selectedIds" sono quindi due signal separati, combinati dal chiamante (Bestiary
// component calcola selectedMonsters filtrando catalog() con selectedIds()).
@Injectable({ providedIn: 'root' })
export class BestiaryStore {
  private supabase = inject(Supabase);
  private auth = inject(Auth);

  readonly catalog = signal<BestiaryMonster[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly loading = signal(false);

  // Quota di mostri selezionabili nel Bestiario di UNA campagna (Bestiary.openPicker) in
  // base al rango araldico dell'utente corrente (vedi core/ranks.ts): a differenza dei PNG
  // (catalogo/conteggio globali), qui il conteggio è per singola campagna, perché
  // selectedIds() riflette già solo la selezione della campagna caricata (vedi
  // loadSelectionForCampaign). Rispecchia il limite applicato lato RLS
  // (get_campaign_addition_limit), qui solo per la UI (disabilitare l'aggiunta in anticipo).
  readonly myBestiaryLimit = computed(() => getCampaignAdditionLimitForSeconds(this.auth.navigationSeconds(), this.auth.isAdmin()));
  readonly myBestiaryCount = computed(() => this.selectedIds().size);
  readonly canAddMonsterToCampaign = computed(() => this.myBestiaryCount() < this.myBestiaryLimit());

  async loadCatalog() {
    this.loading.set(true);

    const { data, error } = await this.supabase.client
      .from('bestiary_monsters')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Errore caricamento catalogo bestiario', error.message);
      this.catalog.set([]);
      this.loading.set(false);
      return;
    }

    this.catalog.set(data ?? []);
    this.loading.set(false);
  }

  async loadSelectionForCampaign(campaignId: string) {
    const { data, error } = await this.supabase.client
      .from('campaign_bestiary_monsters')
      .select('monster_id')
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Errore caricamento selezione bestiario campagna', error.message);
      this.selectedIds.set(new Set());
      return;
    }

    this.selectedIds.set(new Set((data ?? []).map((row) => row.monster_id)));
  }

  async createMonster(payload: Omit<BestiaryMonster, 'id'>) {
    const userId = this.auth.user()?.id;
    if (!userId) return { error: { message: 'Utente non autenticato' } };

    const { error } = await this.supabase.client.from('bestiary_monsters').insert({
      ...payload,
      created_by: userId,
    });

    if (!error) {
      await this.loadCatalog();
    }

    return { error };
  }

  async updateMonster(id: string, payload: Partial<BestiaryMonster>) {
    // .update() senza .select() non segnala nulla se la RLS blocca la riga: PostgREST
    // risponde "successo, 0 righe toccate" senza errore. Il .select() forza a scoprirlo
    // (stesso guard usato in Auth.uploadAvatar).
    const { data, error } = await this.supabase.client
      .from('bestiary_monsters')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) return { error };
    if (!data || data.length === 0) {
      return { error: { message: 'Mostro non aggiornato: controlla i permessi (RLS) su bestiary_monsters.' } };
    }

    await this.loadCatalog();
    return { error: null };
  }

  async deleteMonster(id: string) {
    const { data, error } = await this.supabase.client
      .from('bestiary_monsters')
      .delete()
      .eq('id', id)
      .select();

    if (error) return { error };
    if (!data || data.length === 0) {
      return { error: { message: 'Mostro non eliminato: controlla i permessi (RLS) su bestiary_monsters.' } };
    }

    await this.loadCatalog();
    return { error: null };
  }

  async uploadMonsterImage(file: File) {
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('bestiary')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      return { error: uploadError };
    }

    const { data } = this.supabase.client.storage.from('bestiary').getPublicUrl(path);
    return { error: null, url: data.publicUrl };
  }

  async addToCampaign(campaignId: string, monsterId: string) {
    const { error } = await this.supabase.client
      .from('campaign_bestiary_monsters')
      .insert({ campaign_id: campaignId, monster_id: monsterId });

    if (!error) {
      this.selectedIds.update((ids) => new Set(ids).add(monsterId));
    }

    return { error };
  }

  async removeFromCampaign(campaignId: string, monsterId: string) {
    const { error } = await this.supabase.client
      .from('campaign_bestiary_monsters')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('monster_id', monsterId);

    if (!error) {
      this.selectedIds.update((ids) => {
        const next = new Set(ids);
        next.delete(monsterId);
        return next;
      });
    }

    return { error };
  }
}
