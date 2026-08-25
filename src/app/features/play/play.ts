import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActiveCampaign } from '../../core/active-campaign';
import { Auth } from '../../core/auth';
import { AppNav } from '../../core/app-nav';
import { TokenPositionEvent } from '../../core/campaign-tokens';
import { CharacterStore } from '../../core/character-store';
import { LocaleService } from '../../core/locale';
import { MapAlbumImage } from '../../core/map-albums';
import { BoardViewport } from './components/interactive-board/board-viewport';
import { PlaySessionChannel } from './play-session-channel';
import { PlayCharacterPanel } from './play-character-panel';
import { PlayMasterPanel } from './play-master-panel';
import { PlayMapPanel } from './play-map-panel';

// Base strutturale della pagina "Gioca" (rotta /gioca/:campaignId, stesso pattern di
// CharacterSheetPage): due colonne, contenuto della sinistra diverso per ruolo. Mappa
// attiva e posizione dei token sono sincronizzate in realtime via Supabase Broadcast
// (vedi PlaySessionChannel); solo i token vengono anche persistiti su DB (campaign_tokens),
// la mappa attiva resta volutamente solo in memoria.
@Component({
  selector: 'app-play',
  standalone: true,
  imports: [PlayCharacterPanel, PlayMasterPanel, PlayMapPanel],
  // Uniche per sessione di gioco ma servono a più rami dell'albero: BoardViewport a
  // Bestiary/PlayCharacterPanel (centro del viewport per piazzare pedine) oltre che a
  // InteractiveBoardComponent; PlaySessionChannel incapsula canale realtime + stato token.
  // Fornite qui, non nei componenti che le usano, così è la stessa istanza per tutto il
  // sotto-albero di Play.
  providers: [BoardViewport, PlaySessionChannel],
  templateUrl: './play.html',
})
export class Play implements OnInit {
  private route = inject(ActivatedRoute);
  private activeCampaign = inject(ActiveCampaign);
  private auth = inject(Auth);
  private characterStore = inject(CharacterStore);
  private session = inject(PlaySessionChannel);
  protected appNav = inject(AppNav);
  protected localeService = inject(LocaleService);

  readonly campaignId = this.route.snapshot.paramMap.get('campaignId')!;

  // Ricalcolato qui invece di fidarsi di un booleano esterno: stessa logica di
  // CampaignHub.isOwner / Bestiary.canManage / Maps.canManage.
  protected isMaster = computed(() => {
    const campaign = this.activeCampaign.current();
    const userId = this.auth.user()?.id;
    return (!!campaign && !!userId && campaign.owner_id === userId) || this.auth.isAdmin();
  });

  // Il personaggio del giocatore corrente in questa campagna (null per il Master o per chi
  // non ne ha ancora uno): determina quale pedina un giocatore può trascinare.
  protected myCharacterId = computed(() => this.characterStore.myCharacter()?.id ?? null);

  // Stato locale, non persistito: la mappa scelta dal Master per la sessione si perde al
  // reload. Il valore è condiviso in tempo reale con i giocatori connessi (vedi
  // PlaySessionChannel), ma non finisce mai sul DB.
  protected activeImage = signal<MapAlbumImage | null>(null);

  // A scomparsa: quando chiuso, la mappa occupa tutta la pagina.
  protected panelOpen = signal(true);

  protected tokens = this.session.tokens;

  constructor() {
    // Master -> Giocatori: ogni cambio mappa lato Master viene ribroadcastato.
    effect(() => {
      const image = this.activeImage();
      if (this.isMaster() && image) {
        this.session.broadcastMap(image);
      }
    });

    // Giocatori: activeImage cambia solo per effetto del broadcast in arrivo. Il guard
    // isMaster() evita che il Master, se mai ricevesse un proprio broadcast, lo riapplichi.
    effect(() => {
      const image = this.session.incomingImage();
      if (image && !this.isMaster()) {
        this.activeImage.set(image);
      }
    });
  }

  ngOnInit() {
    this.session.connect(this.campaignId, () => {
      // Late joiner: un giocatore che entra dopo il primo cambio mappa non ha ricevuto il
      // broadcast originale. Alla riconnessione del canale del Master, se una mappa è già
      // attiva la ritrasmettiamo per allinearlo.
      if (this.isMaster() && this.activeImage()) {
        this.session.broadcastMap(this.activeImage()!);
      }
    });
  }

  goBackToHub() {
    this.appNav.setTab('hub');
  }

  togglePanel() {
    this.panelOpen.update((open) => !open);
  }

  protected onTokenPositionChange(event: TokenPositionEvent) {
    this.session.moveToken(event);
  }

  protected onTokensChanged() {
    this.session.notifyTokensChanged();
  }
}
