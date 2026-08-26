import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { CampaignTokens, TokenPositionEvent } from '../../core/campaign-tokens';
import { FogOfWarStore, FogState } from './fog-of-war-store';
import { MapAlbumImage } from '../../core/map-albums';
import { Supabase } from '../../core/supabase';

const MAP_CHANGED_EVENT = 'map-changed';
const TOKEN_MOVED_EVENT = 'token-moved';
const TOKENS_CHANGED_EVENT = 'tokens-changed';
const FOG_CHANGED_EVENT = 'fog-changed';

interface MapChangedPayload {
  image: MapAlbumImage;
}

interface TokenMovedPayload {
  tokenId: string;
  x: number;
  y: number;
  // false durante il trascinamento, true al rilascio: dice al ricevente quando può
  // consolidare la posizione in CampaignTokens.tokens() invece di tenerla solo come
  // override provvisorio in livePositions.
  committed: boolean;
}

// Canale Supabase Realtime `play-session:${campaignId}`, estratto da Play (che con questa
// logica dentro sforava il limite di 200 righe): gestisce il broadcast di mappa attiva e
// posizione dei token, e tiene le posizioni "in volo" (livePositions) che sovrascrivono
// campaignTokens.tokens() finché non vengono consolidate. Fornito nei `providers` di Play
// (non root): una istanza per sessione di gioco, distrutta col componente.
@Injectable()
export class PlaySessionChannel {
  private supabase = inject(Supabase);
  private campaignTokens = inject(CampaignTokens);
  private fogStore = inject(FogOfWarStore);
  private destroyRef = inject(DestroyRef);

  private channel: RealtimeChannel | null = null;

  // Posizioni "in volo": sovrascrivono la posizione nota in campaignTokens.tokens() finché
  // non viene consolidato un valore più recente. Popolate sia ricevendo il broadcast di un
  // drag altrui, sia otticamente su moveToken() per il proprio drag (altrimenti, durante
  // l'attesa del round-trip DB al rilascio, il rendering ricadrebbe sul valore DB pre-drag,
  // dando l'impressione che la pedina "torni indietro").
  private livePositions = signal<Record<string, { x: number; y: number }>>({});

  readonly tokens = computed(() => {
    const live = this.livePositions();
    return this.campaignTokens.tokens().map((token) => (live[token.id] ? { ...token, ...live[token.id] } : token));
  });

  // Ultima mappa ricevuta dal Master via broadcast: Play la applica al proprio
  // activeImage() con un effect (solo se non è lui stesso il Master, altrimenti sarebbe
  // un eco di quanto appena inviato).
  readonly incomingImage = signal<MapAlbumImage | null>(null);

  constructor() {
    // Igiene: ogni volta che la lista autorevole cambia (dopo un load()), scarta le
    // posizioni "in volo" di token che non esistono più (rimossi altrove) — altrimenti
    // livePositions cresce indefinitamente per tutta la sessione. Ritornare la stessa
    // referenza quando non c'è nulla da scartare evita di far ricalcolare `tokens` a ogni
    // load() senza motivo.
    effect(() => {
      const validIds = new Set(this.campaignTokens.tokens().map((t) => t.id));
      this.livePositions.update((map) => {
        const entries = Object.entries(map).filter(([id]) => validIds.has(id));
        return entries.length === Object.keys(map).length ? map : Object.fromEntries(entries);
      });
    });

    this.destroyRef.onDestroy(() => this.disconnect());
  }

  // onSubscribed è chiamato quando il canale passa a 'SUBSCRIBED': Play lo usa per il
  // late-joiner catch-up (ri-broadcastare la mappa attiva se il chiamante è il Master).
  connect(campaignId: string, onSubscribed: () => void) {
    this.campaignTokens.load(campaignId);

    this.channel = this.supabase.client
      .channel(`play-session:${campaignId}`)
      .on('broadcast', { event: MAP_CHANGED_EVENT }, ({ payload }) => {
        this.incomingImage.set((payload as MapChangedPayload).image);
      })
      .on('broadcast', { event: TOKEN_MOVED_EVENT }, ({ payload }) => {
        const { tokenId, x, y, committed } = payload as TokenMovedPayload;
        this.livePositions.update((map) => ({ ...map, [tokenId]: { x, y } }));

        // Al rilascio, chi ha spostato il token ha già persistito su DB (vedi
        // moveToken()): qui consolidiamo subito lo stesso valore nella lista autorevole
        // invece di aspettare un load() completo, e togliamo l'override — se restasse
        // lì mascererebbe silenziosamente un futuro load() con dati diversi.
        if (committed) {
          this.campaignTokens.applyRemotePosition(tokenId, x, y);
          this.clearLivePosition(tokenId);
        }
      })
      .on('broadcast', { event: TOKENS_CHANGED_EVENT }, () => {
        // Chi ha fatto la mutazione l'ha già applicata in ottimistico sul proprio
        // CampaignTokens.tokens(): qui ricarichiamo solo per allineare gli altri client.
        this.campaignTokens.load(campaignId);
      })
      .on('broadcast', { event: FOG_CHANGED_EVENT }, ({ payload }) => {
        // Chi ha disegnato ha già persistito su DB (vedi Play.onFogChanged): qui si applica
        // solo in locale, niente reload — il payload porta già lo stato completo.
        this.fogStore.setLocal(payload as FogState);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onSubscribed();
      });
  }

  disconnect() {
    if (this.channel) {
      this.supabase.client.removeChannel(this.channel);
      this.channel = null;
    }
  }

  broadcastMap(image: MapAlbumImage) {
    this.channel?.send({ type: 'broadcast', event: MAP_CHANGED_EVENT, payload: { image } satisfies MapChangedPayload });
  }

  // Durante il drag (committed: false) trasmette solo la posizione provvisoria; al
  // rilascio (committed: true) trasmette la posizione finale (già agganciata alla griglia)
  // e la persiste su campaign_tokens.
  moveToken(event: TokenPositionEvent) {
    // Applicato subito anche sul proprio client, non solo trasmesso: senza questo, chi
    // trascina non vedeva alcun aggiornamento in tokens() finché updatePosition() non
    // completava il round-trip di rete.
    this.livePositions.update((map) => ({ ...map, [event.tokenId]: { x: event.x, y: event.y } }));

    this.channel?.send({
      type: 'broadcast',
      event: TOKEN_MOVED_EVENT,
      payload: { tokenId: event.tokenId, x: event.x, y: event.y, committed: event.committed } satisfies TokenMovedPayload,
    });

    if (event.committed) {
      this.campaignTokens.updatePosition(event.tokenId, event.x, event.y).finally(() => {
        // Tolto in entrambi i casi (successo o fallimento): dopo un fallimento
        // campaignTokens.tokens() resta al vecchio valore, quindi togliere l'override fa
        // tornare correttamente la pedina alla posizione reale invece di mascherare
        // silenziosamente un salvataggio non riuscito.
        this.clearLivePosition(event.tokenId);
      });
    }
  }

  // Evocato da Bestiary (mostro), PlayCharacterPanel (proprio PG) o dal menu contestuale
  // di una pedina (rimozione/lock/visibilità): la mutazione DB è già fatta e già applicata
  // in locale da CampaignTokens, qui serve solo avvisare gli altri client di ricaricare.
  notifyTokensChanged() {
    this.channel?.send({ type: 'broadcast', event: TOKENS_CHANGED_EVENT, payload: {} });
  }

  // Chiamato da Play dopo una modifica locale del Master (reveal/cover/reset, vedi
  // InteractiveBoardComponent.fogChanged): il chiamante persiste su DB, qui si trasmette
  // solo lo stato completo agli altri client.
  broadcastFog(state: FogState) {
    this.channel?.send({ type: 'broadcast', event: FOG_CHANGED_EVENT, payload: state });
  }

  private clearLivePosition(tokenId: string) {
    this.livePositions.update((map) => {
      if (!(tokenId in map)) return map;
      const { [tokenId]: _removed, ...rest } = map;
      return rest;
    });
  }
}
