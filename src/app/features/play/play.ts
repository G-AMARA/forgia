import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActiveCampaign } from '../../core/active-campaign';
import { Auth } from '../../core/auth';
import { AppNav } from '../../core/app-nav';
import { TokenPositionEvent } from '../../core/campaign-tokens';
import { CharacterStore } from '../../core/character-store';
import { LocaleService } from '../../core/locale';
import { MapAlbumImage, MapAlbumsStore } from '../../core/map-albums';
import { BoardViewport } from './components/interactive-board/board-viewport';
import { FogOfWarStore, FogState } from './fog-of-war-store';
import { PlaySessionChannel } from './play-session-channel';
import { PlayCharacterPanel } from './play-character-panel';
import { PlayMasterPanel } from './play-master-panel';
import { PlayMapPanel } from './play-map-panel';

// Sotto questa soglia il drawer laterale è un overlay a tutta larghezza invece di una
// colonna stretta (vedi play.html): allineata al breakpoint `lg` di Tailwind, usata qui
// solo per decidere lo stato iniziale del drawer (aperto su desktop, chiuso su mobile/
// tablet, dove coprirebbe gran parte della mappa).
const DESKTOP_BREAKPOINT_PX = 1024;

// Base strutturale della pagina "Gioca" (rotta /gioca/:campaignId, stesso pattern di
// CharacterSheetPage): due colonne, contenuto della sinistra diverso per ruolo. Mappa
// attiva e posizione dei token sono sincronizzate in realtime via Supabase Broadcast (vedi
// PlaySessionChannel) E persistite su DB (campaigns.active_map_id, campaign_tokens): il
// broadcast da solo non basta, non viene "riproposto" a chi si iscrive al canale dopo
// l'invio (un giocatore che entra dopo, o un reload — vedi hydrateActiveMapFromDb).
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
  private fogStore = inject(FogOfWarStore);
  private mapAlbums = inject(MapAlbumsStore);
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

  // Mappa scelta dal Master per la sessione: condivisa in tempo reale (broadcast, vedi
  // PlaySessionChannel) e idratata da campaigns.active_map_id all'ingresso in sessione se
  // il broadcast non è mai arrivato (vedi hydrateActiveMapFromDb).
  protected activeImage = signal<MapAlbumImage | null>(null);

  // A scomparsa: quando chiuso, la mappa occupa tutta la pagina. Aperto di default su
  // desktop (comportamento invariato), chiuso su mobile/tablet: lì il drawer è largo
  // quanto lo schermo (vedi play.html), aprirlo subito nasconderebbe l'intera plancia.
  protected isDrawerOpen = signal(window.innerWidth >= DESKTOP_BREAKPOINT_PX);

  // Suggerimento di rotazione (solo mobile in portrait, vedi play.html): "Continua
  // comunque" lo chiude per il resto della sessione, anche se il dispositivo resta
  // in verticale — non deve ripresentarsi a ogni ridisegno.
  protected portraitHintDismissed = signal(false);

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

    // La nebbia è per mappa (campaign_id + map_image_id): ogni cambio di activeImage()
    // ricarica lo stato persistito di quella mappa, sia per il Master sia per i giocatori.
    effect(() => {
      const image = this.activeImage();
      if (image) {
        this.fogStore.load(this.campaignId, image.id);
      } else {
        this.fogStore.clear();
      }
    });
  }

  async ngOnInit() {
    // Sempre, incondizionatamente — non solo se current()?.id !== campaignId: chi entra da
    // Dashboard arriva già con current() impostato a QUELLA campagna (Dashboard.enterCampaign),
    // ma con un oggetto parziale, la cui query non seleziona active_map_id. L'id combaciava
    // già, quindi quel guard saltava il fetch e lasciava active_map_id a undefined — bug
    // presente solo entrando dalla Dashboard, mai al refresh (lì current() riparte da null e
    // il fetch scattava comunque, il motivo per cui F5 "sembrava" risolverlo).
    await this.activeCampaign.loadCampaignById(this.campaignId);
    await this.hydrateActiveMapFromDb();

    this.session.connect(this.campaignId, () => {
      // Late joiner/reconnect: un giocatore che si iscrive al canale DOPO un cambio mappa
      // non riceve quel broadcast passato (non viene "riproposto"). Il Master, se la sua
      // mappa è già nota, la ritrasmette; chiunque altro riverifica lo stato sul DB.
      if (this.isMaster() && this.activeImage()) {
        this.session.broadcastMap(this.activeImage()!);
      }
      this.hydrateActiveMapFromDb();
    });
  }

  // Idrata activeImage da campaigns.active_map_id se non è già valorizzato (da un
  // broadcast, o da una scelta locale del Master ancora in corso di salvataggio): mai
  // sovrascrive un valore già presente, il DB qui è solo un fallback per chi non ha ricevuto
  // nulla in tempo reale, non la fonte di verità durante la sessione.
  private async hydrateActiveMapFromDb() {
    if (this.activeImage()) return;
    const mapImageId = this.activeCampaign.current()?.active_map_id;
    if (!mapImageId) return;

    const image = await this.mapAlbums.loadImageById(mapImageId);
    if (!image) {
      // loadImageById logga già l'errore/il "non trovato" specifico: qui il contesto in
      // più (campagna, ruolo) serve a distinguere subito un problema di RLS (log solo per i
      // giocatori) da un mapImageId ormai orfano (persisterebbe anche per il Master).
      console.error('[hydrateActiveMapFromDb] mappa attiva non caricata', {
        campaignId: this.campaignId,
        mapImageId,
        isMaster: this.isMaster(),
      });
      return;
    }
    if (!this.activeImage()) {
      this.activeImage.set(image);
    }
  }

  // Selezione del Master (PlayMapPicker, dentro PlayMasterPanel): oltre allo stato locale
  // (già trasmesso via broadcast dall'effect nel costruttore), persiste su
  // campaigns.active_map_id così chi entra dopo o ricarica la ritrova (vedi
  // hydrateActiveMapFromDb). image null = "Rimuovi mappa".
  protected onSelectImage(image: MapAlbumImage | null) {
    this.activeImage.set(image);
    this.activeCampaign.setActiveMap(this.campaignId, image?.id ?? null);
  }

  goBackToHub() {
    this.appNav.setTab('hub');
  }

  toggleDrawer() {
    this.isDrawerOpen.update((open) => !open);
  }

  // Chiamata dal backdrop mobile (FIX 1): a differenza di toggleDrawer(), un tap fuori dal
  // pannello deve solo chiuderlo, mai riaprirlo.
  closeDrawer() {
    this.isDrawerOpen.set(false);
  }

  protected onTokenPositionChange(event: TokenPositionEvent) {
    this.session.moveToken(event);
  }

  protected onTokensChanged() {
    this.session.notifyTokensChanged();
  }

  // Emesso dal Master dopo reveal/cover/reset (InteractiveBoardComponent.fogChanged): già
  // applicato in locale da FogOfWarStore, qui si persiste e si trasmette agli altri client.
  protected onFogChanged(state: FogState) {
    const mapImageId = this.activeImage()?.id;
    if (!mapImageId) return;
    this.fogStore.save(this.campaignId, mapImageId, state);
    this.session.broadcastFog(state);
  }
}
