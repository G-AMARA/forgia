import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';

export interface CampaignInvite {
  id: string;
  campaignId: string;
  dmNickname: string;
  campaignName: string;
  coverKey: string;
  description: string | null;
  isPublic: boolean;
  level: number;
  currentPlayers: number;
  maxPlayers: number | null;
  nextSessionAt: string | null;
}

export interface PlatformNews {
  id: string;
  title: string;
  date: string;
  body: string;
  unread: boolean;
}

// Le comunicazioni admin (tab "Comunicazioni") restano mock in attesa di una tabella
// dedicata: stessa forma che avrà la risposta reale. Gli inviti campagna invece sono reali,
// vedi campaign_invites (sql/2026-09-14_campaign_invites.sql).
@Injectable({ providedIn: 'root' })
export class InboxStore {
  private supabase = inject(Supabase);
  private auth = inject(Auth);

  readonly invites = signal<CampaignInvite[]>([]);
  readonly invitesLoading = signal(false);

  readonly news = signal<PlatformNews[]>([
    {
      id: 'news-1',
      title: 'Aggiornamento Piattaforma v2.0',
      date: '10/09/2026',
      body: 'Nuovo Centro Messaggi, correzioni al sistema di araldica e miglioramenti alle prestazioni generali del portale.',
      unread: true,
    },
    {
      id: 'news-2',
      title: 'Nuove regole per Araldica',
      date: '05/09/2026',
      body: 'I ranghi ora tengono conto anche del tempo speso in Dungeon EXP, non solo della navigazione.',
      unread: false,
    },
  ]);

  readonly unreadCount = computed(() => this.invites().length + this.news().filter((n) => n.unread).length);

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id;
      if (userId) {
        this.loadInvites();
        this.applyNewsReadState(userId);
      } else {
        this.invites.set([]);
      }
    });
  }

  // "Letto" per le comunicazioni non ha ancora una tabella dedicata (sono mock, vedi sopra):
  // persistito in localStorage per utente, stesso pattern di araldica.ts
  // (araldica_rank_${userId}), così il pallino non ricompare a ogni refresh/cambio pagina.
  private newsReadStorageKey(userId: string): string {
    return `inbox_read_news_${userId}`;
  }

  private readNewsIds(userId: string): Set<string> {
    const raw = localStorage.getItem(this.newsReadStorageKey(userId));
    if (!raw) return new Set();
    try {
      return new Set(JSON.parse(raw));
    } catch {
      return new Set();
    }
  }

  private applyNewsReadState(userId: string) {
    const readIds = this.readNewsIds(userId);
    if (readIds.size === 0) return;
    this.news.update((list) => list.map((n) => (readIds.has(n.id) ? { ...n, unread: false } : n)));
  }

  async loadInvites() {
    const userId = this.auth.user()?.id;
    if (!userId) {
      this.invites.set([]);
      return;
    }

    this.invitesLoading.set(true);

    const { data: inviteRows, error } = await this.supabase.client
      .from('campaign_invites')
      .select('id, campaign_id')
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !inviteRows || inviteRows.length === 0) {
      this.invites.set([]);
      this.invitesLoading.set(false);
      return;
    }

    const campaignIds = [...new Set(inviteRows.map((row) => row.campaign_id))];

    const [{ data: campaigns }, { data: characterRows }] = await Promise.all([
      this.supabase.client
        .from('campaigns')
        .select('id, name, description, cover_key, owner_id, is_public, starting_level, max_players, next_session_at')
        .in('id', campaignIds),
      this.supabase.client.from('characters').select('campaign_id').in('campaign_id', campaignIds),
    ]);

    const ownerIds = [...new Set((campaigns ?? []).map((c) => c.owner_id))];
    const { data: profiles } =
      ownerIds.length > 0
        ? await this.supabase.client.from('profiles').select('id, nickname').in('id', ownerIds)
        : { data: [] as { id: string; nickname: string | null }[] };

    const nicknameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.nickname ?? '???']));
    const countMap = new Map<string, number>();
    for (const row of characterRows ?? []) {
      countMap.set(row.campaign_id, (countMap.get(row.campaign_id) ?? 0) + 1);
    }
    const campaignMap = Object.fromEntries((campaigns ?? []).map((c) => [c.id, c]));

    const mapped = inviteRows
      .map((row): CampaignInvite | null => {
        const campaign = campaignMap[row.campaign_id];
        if (!campaign) return null;

        return {
          id: row.id,
          campaignId: campaign.id,
          dmNickname: nicknameMap[campaign.owner_id] ?? '???',
          campaignName: campaign.name,
          coverKey: campaign.cover_key,
          description: campaign.description,
          isPublic: campaign.is_public,
          level: campaign.starting_level,
          currentPlayers: countMap.get(campaign.id) ?? 0,
          maxPlayers: campaign.max_players,
          nextSessionAt: campaign.next_session_at,
        };
      })
      .filter((invite): invite is CampaignInvite => invite !== null);

    this.invites.set(mapped);
    this.invitesLoading.set(false);
  }

  // Ricontrolla la capienza al momento dell'accettazione (non fida del conteggio caricato
  // con l'invito, che nel frattempo potrebbe essere invecchiato). L'invito resta come storico
  // con lo stato della risposta (vedi sql/2026-09-14_campaign_invites_status.sql), non viene
  // più cancellato: una campagna piena si traduce in stato 'declined', coerente con le sole
  // 3 fasi mostrate al Master (Inviato/Accettato/Rifiutato). In entrambi i casi sparisce
  // comunque dagli inviti in sospeso dell'invitato (loadInvites filtra su status 'pending').
  async acceptInvite(invite: CampaignInvite): Promise<{ error: { message: string } | null; full: boolean }> {
    const { count } = await this.supabase.client
      .from('characters')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', invite.campaignId);

    const isFull = invite.maxPlayers !== null && (count ?? 0) >= invite.maxPlayers;

    const { error } = await this.supabase.client
      .from('campaign_invites')
      .update({ status: isFull ? 'declined' : 'accepted' })
      .eq('id', invite.id);

    if (!error) {
      this.invites.update((list) => list.filter((i) => i.id !== invite.id));
    }

    return { error, full: !error && isFull };
  }

  async declineInvite(id: string): Promise<{ error: { message: string } | null }> {
    const { error } = await this.supabase.client
      .from('campaign_invites')
      .update({ status: 'declined' })
      .eq('id', id);

    if (!error) {
      this.invites.update((list) => list.filter((i) => i.id !== id));
    }
    return { error };
  }

  // Usato da CampaignHub per decidere se un utente senza personaggio può vedere "Aggiungi il
  // tuo Eroe"/"Gioca" su una campagna PRIVATA: solo se ha un invito con status 'accepted' per
  // quella campagna (i pending non bastano, vanno prima accettati dal Centro Messaggi). Le
  // campagne pubbliche non passano da qui, restano aperte a chiunque (vedi CampaignHub).
  async hasAcceptedInvite(campaignId: string): Promise<boolean> {
    const userId = this.auth.user()?.id;
    if (!userId) return false;

    const { data } = await this.supabase.client
      .from('campaign_invites')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('invited_user_id', userId)
      .eq('status', 'accepted')
      .maybeSingle();

    return !!data;
  }

  markAsRead(id: string) {
    this.news.update((list) => list.map((n) => (n.id === id ? { ...n, unread: false } : n)));

    const userId = this.auth.user()?.id;
    if (!userId) return;
    const readIds = this.readNewsIds(userId);
    readIds.add(id);
    localStorage.setItem(this.newsReadStorageKey(userId), JSON.stringify([...readIds]));
  }
}
