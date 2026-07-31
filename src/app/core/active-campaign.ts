import { Injectable, inject, signal, effect } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  edition_code: string;
  cover_key: string;
  owner_id?: string;
}

@Injectable({ providedIn: 'root' })
export class ActiveCampaign {
  private supabase = inject(Supabase);
  private auth = inject(Auth);

  readonly campaigns = signal<Campaign[]>([]);
  readonly current = signal<Campaign | null>(null);

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id;
      if (userId) {
        this.loadCampaigns();
      } else {
        this.campaigns.set([]);
        this.current.set(null);
      }
    });
  }

  async loadCampaigns() {
    const userId = this.auth.user()?.id;
    if (!userId) {
      this.campaigns.set([]);
      return;
    }

    const { data, error } = await this.supabase.client
      .from('campaigns')
      .select('id, name, description, edition_code, cover_key, owner_id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore caricamento campagne', error.message);
      return;
    }

    this.campaigns.set(data ?? []);

    if (!this.current() && data && data.length > 0) {
      this.current.set(data[0]);
    }
  }

  async createCampaign(
    name: string,
    description: string,
    editionCode: string,
    coverKey: string
  ) {
    const userId = this.auth.user()?.id;
    if (!userId) {
      return { error: { message: 'Devi essere autenticato per creare una campagna' } };
    }

    const { data, error } = await this.supabase.client
      .from('campaigns')
      .insert({
        owner_id: userId,
        name,
        description,
        edition_code: editionCode,
        cover_key: coverKey,
      })
      .select('id, name, description, edition_code, cover_key, owner_id')
      .single();

    if (!error && data) {
      this.campaigns.update((list) => [data, ...list]);
      this.current.set(data);
    }

    return { data, error };
  }

  selectCampaign(campaign: Campaign) {
    this.current.set(campaign);
  }

  async updateCampaign(
    campaignId: string,
    updates: { name: string; description: string; coverKey: string }
  ) {
    const { data, error } = await this.supabase.client
      .from('campaigns')
      .update({
        name: updates.name,
        description: updates.description,
        cover_key: updates.coverKey,
      })
      .eq('id', campaignId)
      .select('id, name, description, edition_code, cover_key, owner_id')
      .single();

    if (!error && data) {
      this.campaigns.update((list) => list.map((c) => (c.id === campaignId ? data : c)));
      if (this.current()?.id === campaignId) {
        this.current.set(data);
      }
    }

    return { error };
  }

  async deleteCampaign(campaignId: string) {
    const { error } = await this.supabase.client.from('campaigns').delete().eq('id', campaignId);

    if (!error) {
      this.campaigns.update((list) => list.filter((c) => c.id !== campaignId));

      if (this.current()?.id === campaignId) {
        const remaining = this.campaigns();
        this.current.set(remaining.length > 0 ? remaining[0] : null);
      }
    }

    return { error };
  }
}
