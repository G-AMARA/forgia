import { Injectable, inject, signal } from '@angular/core';
import { Supabase } from './supabase';

// Provenienza della pedina: usata solo per la resa visiva (bordo diverso, vedi
// token-permissions.ts borderClassFor), non incide su permessi/drag.
export type TokenKind = 'character' | 'monster' | 'npc';

export interface CampaignToken {
  id: string;
  campaignId: string;
  characterId: string | null;
  name: string;
  avatarUrl: string;
  x: number;
  y: number;
  size: number;
  isLocked: boolean;
  isVisible: boolean;
  kind: TokenKind;
}

export interface NewCampaignToken {
  campaignId: string;
  characterId: string | null;
  name: string;
  avatarUrl: string;
  x: number;
  y: number;
  kind: TokenKind;
}

// Payload condiviso tra InteractiveBoardComponent (emette durante/dopo il drag) e Play
// (broadcasta agli altri client e persiste su commit). Vive qui e non dentro
// interactive-board.ts perché è un evento di dominio, non un dettaglio di rendering.
export interface TokenPositionEvent {
  tokenId: string;
  x: number;
  y: number;
  // false durante il trascinamento (solo broadcast), true al rilascio (broadcast + persistenza).
  committed: boolean;
}

// Avatar di fallback per pedine senza immagine (mostro senza image_url nel catalogo,
// personaggio senza avatar caricato): avatar_url è NOT NULL su campaign_tokens.
const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#334155"/><text x="50" y="65" font-size="48" text-anchor="middle" fill="#cbd5e1">?</text></svg>';
export const TOKEN_PLACEHOLDER_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

const TOKEN_COLUMNS = 'id, campaign_id, character_id, name, avatar_url, x, y, size, is_locked, is_visible, kind';

function mapRow(row: any): CampaignToken {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    characterId: row.character_id,
    name: row.name,
    avatarUrl: row.avatar_url,
    x: row.x,
    y: row.y,
    size: row.size,
    isLocked: row.is_locked,
    isVisible: row.is_visible,
    kind: row.kind,
  };
}

@Injectable({ providedIn: 'root' })
export class CampaignTokens {
  private supabase = inject(Supabase);

  readonly tokens = signal<CampaignToken[]>([]);

  async load(campaignId: string) {
    const { data, error } = await this.supabase.client
      .from('campaign_tokens')
      .select(TOKEN_COLUMNS)
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Errore caricamento pedine', error.message);
      return;
    }

    this.tokens.set((data ?? []).map(mapRow));
  }

  // Evocazione di un mostro (Bestiary) o piazzamento del proprio personaggio
  // (PlayCharacterPanel): entrambi passano da qui, cambia solo characterId (null per i
  // mostri). Ritorna il token creato, o null se la scrittura è stata respinta (es. RLS: un
  // giocatore può piazzare solo un token del proprio personaggio, vedi
  // sql/2026-08-25_campaign_tokens_self_placement.sql) — i chiamanti devono verificarlo
  // prima di notificare la sincronizzazione realtime, altrimenti si broadcasta un
  // "cambiamento" che in realtà non è mai avvenuto.
  async insert(input: NewCampaignToken): Promise<CampaignToken | null> {
    const row = {
      campaign_id: input.campaignId,
      character_id: input.characterId,
      name: input.name,
      avatar_url: input.avatarUrl,
      x: input.x,
      y: input.y,
      kind: input.kind,
    };

    // Un personaggio non può avere più di un token nella stessa campagna (vincolo unique
    // campaign_id+character_id, vedi sql/2026-08-25_campaign_tokens_dedupe.sql): per i PG
    // upsert invece di insert, così ri-piazzare il proprio personaggio sposta/aggiorna il
    // token esistente invece di duplicarlo — anche in caso di doppio click o di race con
    // una remove() ancora in volo. I mostri (characterId null) restano un insert semplice:
    // più pedine dello stesso mostro sono legittime, non c'è nulla su cui fare conflitto.
    const query = input.characterId
      ? this.supabase.client.from('campaign_tokens').upsert(row, { onConflict: 'campaign_id,character_id' })
      : this.supabase.client.from('campaign_tokens').insert(row);

    const { data, error } = await query.select(TOKEN_COLUMNS).single();

    if (error) {
      console.error('Errore creazione pedina', error.message);
      return null;
    }

    const token = mapRow(data);
    // Sostituisce sia l'eventuale riga locale con lo stesso id (caso update dell'upsert)
    // sia qualunque altra riga locale rimasta per lo stesso personaggio (pulizia difensiva
    // di uno stato locale disallineato): per i mostri (characterId null) non filtra per
    // personaggio, altrimenti cancellerebbe tutti gli altri mostri dalla lista.
    this.tokens.update((list) => [
      ...list.filter((t) => t.id !== token.id && (token.characterId === null || t.characterId !== token.characterId)),
      token,
    ]);
    return token;
  }

  // Ritorna true solo se una riga è stata effettivamente cancellata. Per PostgREST una
  // DELETE che la RLS filtra a 0 righe NON è un errore: senza questo controllo esplicito
  // il chiamante crederebbe alla rimozione e la toglierebbe dalla UI locale mentre sul DB
  // resta — è esattamente il bug della pedina "phantom" duplicata al ri-piazzamento.
  async remove(tokenId: string): Promise<boolean> {
    const { data, error } = await this.supabase.client.from('campaign_tokens').delete().eq('id', tokenId).select('id');

    if (error) {
      console.error('Errore rimozione pedina', error.message);
      return false;
    }

    if (!data || data.length === 0) {
      console.error('Errore rimozione pedina: nessuna riga cancellata (permessi insufficienti?)');
      return false;
    }

    this.tokens.update((list) => list.filter((t) => t.id !== tokenId));
    return true;
  }

  // Rimozione di massa dei soli mostri/PNG (mai dei PG, piazzati dai giocatori stessi):
  // usata dal Master per svuotare la plancia in un click, tipicamente prima di cambiare
  // mappa, invece di rimuovere ogni pedina una alla volta dal menu contestuale. Ritorna il
  // numero di pedine effettivamente cancellate.
  async removeMonstersAndNpcs(campaignId: string): Promise<number> {
    const { data, error } = await this.supabase.client
      .from('campaign_tokens')
      .delete()
      .eq('campaign_id', campaignId)
      .in('kind', ['monster', 'npc'])
      .select('id');

    if (error) {
      console.error('Errore rimozione mostri/PNG dalla plancia', error.message);
      return 0;
    }

    const removedIds = new Set((data ?? []).map((row: any) => row.id));
    this.tokens.update((list) => list.filter((t) => !removedIds.has(t.id)));
    return removedIds.size;
  }

  // Chiamata solo al rilascio del drag (evento "committed"): durante il trascinamento la
  // posizione provvisoria viaggia solo via broadcast, mai sul DB.
  async updatePosition(tokenId: string, x: number, y: number) {
    const { error } = await this.supabase.client.from('campaign_tokens').update({ x, y }).eq('id', tokenId);

    if (error) {
      console.error('Errore salvataggio posizione pedina', error.message);
      return;
    }

    this.applyRemotePosition(tokenId, x, y);
  }

  // Patch locale, senza scrittura DB: usata da Play quando riceve il broadcast
  // 'token-moved' con committed=true, per consolidare subito la posizione in tokens()
  // invece di aspettare il prossimo load() completo — chi ha effettivamente spostato il
  // token ha già persistito su DB tramite updatePosition(), qui serve solo allineare lo
  // stato locale degli ALTRI client.
  applyRemotePosition(tokenId: string, x: number, y: number) {
    this.tokens.update((list) => list.map((t) => (t.id === tokenId ? { ...t, x, y } : t)));
  }

  async setLocked(tokenId: string, isLocked: boolean) {
    const { error } = await this.supabase.client.from('campaign_tokens').update({ is_locked: isLocked }).eq('id', tokenId);

    if (error) {
      console.error('Errore aggiornamento lock pedina', error.message);
      return;
    }

    this.tokens.update((list) => list.map((t) => (t.id === tokenId ? { ...t, isLocked } : t)));
  }

  async setVisible(tokenId: string, isVisible: boolean) {
    const { error } = await this.supabase.client.from('campaign_tokens').update({ is_visible: isVisible }).eq('id', tokenId);

    if (error) {
      console.error('Errore aggiornamento visibilità pedina', error.message);
      return;
    }

    this.tokens.update((list) => list.map((t) => (t.id === tokenId ? { ...t, isVisible } : t)));
  }
}
