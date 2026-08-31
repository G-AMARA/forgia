import { Component, DestroyRef, ElementRef, computed, effect, HostListener, inject, input, output, signal, viewChild } from '@angular/core';
import { MapAlbumImage } from '../../../../core/map-albums';
import { LocaleService } from '../../../../core/locale';
import { CampaignToken, TokenPositionEvent } from '../../../../core/campaign-tokens';
import { BoardViewport, WorldPoint } from './board-viewport';
import { ScreenPoint, TokenContextMenuComponent } from './token-context-menu';
import { MonsterCardModalComponent } from '../monster-card-modal/monster-card-modal';
import { TokenDpadComponent } from './token-dpad';
import { BoardTokenComponent } from './board-token';
import { borderClassFor, canDragToken, canRemoveFromBoard, isOwnCharacterToken } from './token-permissions';
import { TokenDrag } from './token-drag';
import { FogDrawing } from './fog-drawing';
import { FogOfWarComponent } from './fog-of-war';
import { FogToolbarComponent } from './fog-toolbar';
import { FogOfWarStore, FogState } from '../../fog-of-war-store';

let nextBoardId = 0;

// Tabellone interattivo: pan/zoom (BoardViewport, condivisa anche con Bestiary/
// PlayCharacterPanel), drag/tap token (TokenDrag) e disegno nebbia (FogDrawing) sono
// servizi dedicati, gli ultimi due locali a questo componente. Griglia, immagine, nebbia e
// pedine condividono lo stesso wrapper .board, restano sempre agganciate.
@Component({
  selector: 'app-interactive-board',
  standalone: true,
  imports: [
    TokenContextMenuComponent,
    MonsterCardModalComponent,
    TokenDpadComponent,
    BoardTokenComponent,
    FogOfWarComponent,
    FogToolbarComponent,
  ],
  providers: [TokenDrag, FogDrawing],
  templateUrl: './interactive-board.html',
})
export class InteractiveBoardComponent {
  private destroyRef = inject(DestroyRef);
  protected localeService = inject(LocaleService);
  protected viewport = inject(BoardViewport);
  protected tokenDrag = inject(TokenDrag);
  protected fogStore = inject(FogOfWarStore);
  protected fogDrawing = inject(FogDrawing);

  readonly image = input.required<MapAlbumImage | null>();
  readonly gridSize = input<number>(50);
  readonly showGrid = input<boolean>(true);
  readonly tokens = input<CampaignToken[]>([]);
  readonly isMaster = input(false);
  readonly myCharacterId = input<string | null>(null);

  readonly tokenPositionChange = output<TokenPositionEvent>();
  // Menu contestuale (rimozione/lock/visibilità): Play la riceve e broadcasta agli altri client.
  readonly tokensChanged = output<void>();
  // Nebbia: reveal/cover/reset locali (Master). Play la riceve, persiste e broadcasta.
  readonly fogChanged = output<FogState>();

  protected contextMenuToken = signal<{ token: CampaignToken; position: ScreenPoint } | null>(null);
  // "Carta del Mostro": puramente locale/presentazionale, non risale mai fino a Play.
  protected inspectedToken = signal<CampaignToken | null>(null);
  // D-Pad mobile: pedina scelta con un tap. Un id, non l'intero token, così selectedToken
  // ricade da sé a null se il token sparisce.
  protected selectedTokenId = signal<string | null>(null);
  protected selectedToken = computed(() => this.tokens().find((t) => t.id === this.selectedTokenId()) ?? null);

  private viewportEl = viewChild<ElementRef<HTMLDivElement>>('viewportEl');

  protected readonly gridPatternId = `board-grid-${nextBoardId++}`;

  constructor() {
    effect(() => {
      const element = this.viewportEl()?.nativeElement;
      if (element) this.viewport.attach(element);
    });

    effect(() => {
      const image = this.image();
      if (image) this.viewport.loadImage(image.imageUrl);
    });

    // Drag vero confermato: niente più anello/pulsazione da selezione D-Pad durante il drag.
    effect(() => {
      if (this.tokenDrag.dragConfirmed()) this.selectedTokenId.set(null);
    });

    // TokenDrag.result: 'tap' seleziona per il D-Pad, 'move'/'commit' emettono verso Play.
    effect(() => {
      const result = this.tokenDrag.result();
      if (!result) return;
      this.tokenDrag.result.set(null);
      if (result.type === 'tap') {
        this.selectedTokenId.set(result.tokenId);
      } else {
        this.tokenPositionChange.emit({
          tokenId: result.tokenId,
          x: result.x,
          y: result.y,
          committed: result.type === 'commit',
        });
      }
    });

    // Solo la modifica LOCALE (FogDrawing.justEdited) risale a Play: un update remoto arriva
    // via FogOfWarStore.setLocal() senza toccare justEdited, niente eco tra i client.
    effect(() => {
      const state = this.fogDrawing.justEdited();
      if (state) {
        this.fogChanged.emit(state);
        this.fogDrawing.justEdited.set(null);
      }
    });

    this.destroyRef.onDestroy(() => this.tokenDrag.draggingToken.set(null));
  }

  protected onImageDragStart(event: DragEvent) {
    event.preventDefault();
  }

  // Click sullo sfondo (BoardToken ferma la propagazione sul proprio): deseleziona, senza
  // questo restava permanente su desktop, dove il D-Pad non è visibile per deselezionare.
  protected onBoardClick() {
    this.selectedTokenId.set(null);
  }

  // In "Modalità Nebbia" il tasto sinistro disegna un rettangolo invece di fare pan (che con
  // tasto sinistro avviene comunque solo con Spazio premuto, vedi BoardViewport.onPointerDown).
  protected onBoardPointerDown(event: PointerEvent) {
    if (this.isMaster() && this.fogDrawing.mode() && event.button === 0) {
      event.preventDefault();
      this.fogDrawing.begin(event);
      return;
    }
    this.viewport.onPointerDown(event);
  }

  protected onResetFog() {
    this.fogChanged.emit(this.fogStore.reset());
  }

  protected isMyCharacter = (token: CampaignToken) => isOwnCharacterToken(token, this.myCharacterId());
  // Giocatore: il PROPRIO personaggio resta sempre visibile anche nel buio (bugfix: prima
  // spariva e non era più recuperabile, vedi isTokenInFog), gli altri token no.
  protected shouldRenderToken(token: CampaignToken): boolean {
    if (this.isMaster()) return true;
    if (!token.isVisible) return false;
    return this.isMyCharacter(token) || this.fogStore.isRevealedAt(token.x, token.y);
  }

  protected isTokenInFog(token: CampaignToken): boolean {
    return !this.isMaster() && this.isMyCharacter(token) && !this.fogStore.isRevealedAt(token.x, token.y);
  }

  @HostListener('window:keydown.escape')
  protected onEscape() {
    this.selectedTokenId.set(null);
  }

  // Posizione da renderizzare: quella del drag in corso per questa pedina, altrimenti quella nota.
  protected tokenPosition(token: CampaignToken): WorldPoint {
    const dragging = this.tokenDrag.draggingToken();
    return dragging && dragging.id === token.id ? { x: dragging.x, y: dragging.y } : { x: token.x, y: token.y };
  }

  protected tokenBorderClass = (token: CampaignToken) => borderClassFor(token, this.myCharacterId());
  protected canDrag = (token: CampaignToken) => canDragToken(token, this.isMaster(), this.myCharacterId());
  protected canRemoveToken = (token: CampaignToken) => canRemoveFromBoard(token, this.isMaster(), this.myCharacterId());

  protected onTokenContextMenu(event: MouseEvent, token: CampaignToken) {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuToken.set({ token, position: { x: event.clientX, y: event.clientY } });
  }

  protected onInspectToken(token: CampaignToken) {
    this.inspectedToken.set(token);
  }

  protected onTokenPointerDown(event: PointerEvent, token: CampaignToken) {
    // Solo tasto sinistro/tap: il tasto centrale sopra una pedina deve poter avviare il pan.
    if (event.button !== 0 || !this.canDrag(token)) return;

    // stopPropagation: muovere una pedina non deve mai muovere anche la mappa sotto.
    event.stopPropagation();
    event.preventDefault();
    this.tokenDrag.begin(event, token.id, this.gridSize());
  }

  // D-Pad mobile: sposta la selezione di una cella, riusando la pipeline del drag.
  protected moveSelectedToken(dx: number, dy: number) {
    const token = this.selectedToken();
    if (!token || !this.canDrag(token)) return;
    const size = this.gridSize();
    const target = this.viewport.clampToBounds({ x: token.x + dx * size, y: token.y + dy * size });
    this.tokenPositionChange.emit({ tokenId: token.id, x: target.x, y: target.y, committed: true });
  }

  protected deselectToken() {
    this.selectedTokenId.set(null);
  }
}
