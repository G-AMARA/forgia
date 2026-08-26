import { Component, computed, DestroyRef, ElementRef, effect, HostListener, inject, input, output, signal, viewChild } from '@angular/core';
import { MapAlbumImage } from '../../../../core/map-albums';
import { LocaleService } from '../../../../core/locale';
import { CampaignToken, TokenPositionEvent } from '../../../../core/campaign-tokens';
import { BoardViewport, WorldPoint } from './board-viewport';
import { ScreenPoint, TokenContextMenuComponent } from './token-context-menu';
import { MonsterCardModalComponent } from '../monster-card-modal/monster-card-modal';
import { TokenDpadComponent } from './token-dpad';
import { BoardTokenComponent } from './board-token';
import { borderClassFor, canDragToken, canRemoveFromBoard } from './token-permissions';

let nextBoardId = 0;

// Sotto questa distanza schermo, pointerdown->pointerup su una pedina è un tap (seleziona per il D-Pad) non un drag.
const TAP_THRESHOLD_PX = 8;

// Tabellone interattivo: pan/zoom delegato a BoardViewport (condivisa da Play, serve anche
// a Bestiary/PlayCharacterPanel per piazzare pedine al centro del viewport) e pedine
// sincronizzate via TokenPositionEvent (broadcast + DB, gestiti dal Play padre). Griglia,
// immagine e pedine condividono lo stesso wrapper .board, restano sempre agganciate.
@Component({
  selector: 'app-interactive-board',
  standalone: true,
  imports: [TokenContextMenuComponent, MonsterCardModalComponent, TokenDpadComponent, BoardTokenComponent],
  templateUrl: './interactive-board.html',
})
export class InteractiveBoardComponent {
  private destroyRef = inject(DestroyRef);
  protected localeService = inject(LocaleService);
  protected viewport = inject(BoardViewport);

  readonly image = input.required<MapAlbumImage | null>();
  readonly gridSize = input<number>(50);
  readonly showGrid = input<boolean>(true);
  readonly tokens = input<CampaignToken[]>([]);
  readonly isMaster = input(false);
  readonly myCharacterId = input<string | null>(null);

  readonly tokenPositionChange = output<TokenPositionEvent>();
  // Menu contestuale (rimozione/lock/visibilità): Play la riceve e broadcasta agli altri client.
  readonly tokensChanged = output<void>();

  // Override locale della posizione durante il drag: usato invece di token.x/y finché non si conclude.
  protected draggingToken = signal<{ id: string; x: number; y: number } | null>(null);
  protected contextMenuToken = signal<{ token: CampaignToken; position: ScreenPoint } | null>(null);
  // "Carta del Mostro" (vedi MonsterCardModalComponent): puramente locale/presentazionale,
  // nessuna mutazione o sync realtime coinvolta, quindi non risale fino a Play.
  protected inspectedToken = signal<CampaignToken | null>(null);
  // D-Pad mobile (FIX 2): pedina scelta con un tap (vedi dropToken). Un id, non l'intero
  // token, così selectedToken ricade da sé a null se il token sparisce (rimosso altrove).
  protected selectedTokenId = signal<string | null>(null);
  protected selectedToken = computed(() => this.tokens().find((t) => t.id === this.selectedTokenId()) ?? null);

  private viewportEl = viewChild<ElementRef<HTMLDivElement>>('viewportEl');

  protected readonly gridPatternId = `board-grid-${nextBoardId++}`;

  private readonly onTokenPointerMove = (event: PointerEvent) => this.dragToken(event);
  private readonly onTokenPointerUp = () => this.dropToken();
  // Screen point a inizio drag e all'ultimo pointermove: la distanza decide tap vs drag.
  private dragStartScreen: ScreenPoint | null = null;
  private lastScreen: ScreenPoint | null = null;

  constructor() {
    effect(() => {
      const element = this.viewportEl()?.nativeElement;
      if (element) this.viewport.attach(element);
    });

    effect(() => {
      const image = this.image();
      if (image) this.viewport.loadImage(image.imageUrl);
    });

    this.destroyRef.onDestroy(() => this.detachTokenDragListeners());
  }

  protected onImageDragStart(event: DragEvent) {
    event.preventDefault();
  }

  // Click sullo sfondo (BoardToken ferma la propagazione sul proprio): deseleziona, senza
  // questo restava permanente su desktop, dove il D-Pad non è visibile per deselezionare.
  protected onBoardClick() {
    this.selectedTokenId.set(null);
  }

  @HostListener('window:keydown.escape')
  protected onEscape() {
    this.selectedTokenId.set(null);
  }

  // Posizione da renderizzare: quella del drag in corso per questa pedina, altrimenti quella nota.
  protected tokenPosition(token: CampaignToken): WorldPoint {
    const dragging = this.draggingToken();
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

    const world = this.viewport.screenToWorld(event.clientX, event.clientY);
    this.dragStartScreen = { x: event.clientX, y: event.clientY };
    this.lastScreen = this.dragStartScreen;
    this.draggingToken.set({ id: token.id, x: world.x, y: world.y });
    window.addEventListener('pointermove', this.onTokenPointerMove);
    window.addEventListener('pointerup', this.onTokenPointerUp);
    // pointercancel (gesture di sistema interrotta): stesso cleanup, altrimenti resta bloccato.
    window.addEventListener('pointercancel', this.onTokenPointerUp);
  }

  // D-Pad mobile: sposta la selezione di una cella, riusando la pipeline del drag.
  protected moveSelectedToken(dx: number, dy: number) {
    const token = this.selectedToken();
    if (!token || !this.canDrag(token)) return;
    const size = this.gridSize();
    this.tokenPositionChange.emit({ tokenId: token.id, x: token.x + dx * size, y: token.y + dy * size, committed: true });
  }

  protected deselectToken() {
    this.selectedTokenId.set(null);
  }

  private dragToken(event: PointerEvent) {
    const dragging = this.draggingToken();
    if (!dragging) return;
    this.lastScreen = { x: event.clientX, y: event.clientY };
    // Niente broadcast finché non è chiaro che è un drag e non un tap (vedi dropToken).
    if (!this.dragThresholdExceeded()) return;

    // Drag vero confermato: niente più anello/pulsazione da selezione D-Pad durante il drag.
    this.selectedTokenId.set(null);

    const world = this.viewport.screenToWorld(event.clientX, event.clientY);
    this.draggingToken.set({ id: dragging.id, x: world.x, y: world.y });
    this.tokenPositionChange.emit({ tokenId: dragging.id, x: world.x, y: world.y, committed: false });
  }

  private dropToken() {
    const dragging = this.draggingToken();
    this.detachTokenDragListeners();

    if (!dragging) {
      this.draggingToken.set(null);
      return;
    }

    if (!this.dragThresholdExceeded()) {
      // Tap: nessun broadcast è mai partito (vedi dragToken), seleziona per il D-Pad.
      this.selectedTokenId.set(dragging.id);
      this.draggingToken.set(null);
      return;
    }

    // Emit PRIMA di svuotare draggingToken: Play applica subito la posizione a
    // livePositions in modo sincrono, quindi il rendering non ricade sul vecchio token.x/y.
    const snapped = { x: this.snapToGrid(dragging.x), y: this.snapToGrid(dragging.y) };
    this.tokenPositionChange.emit({ tokenId: dragging.id, x: snapped.x, y: snapped.y, committed: true });
    this.draggingToken.set(null);
  }

  private dragThresholdExceeded(): boolean {
    const start = this.dragStartScreen;
    const last = this.lastScreen;
    return !!start && !!last && Math.hypot(last.x - start.x, last.y - start.y) > TAP_THRESHOLD_PX;
  }

  private detachTokenDragListeners() {
    window.removeEventListener('pointermove', this.onTokenPointerMove);
    window.removeEventListener('pointerup', this.onTokenPointerUp);
    window.removeEventListener('pointercancel', this.onTokenPointerUp);
  }

  // Aggancia al centro del quadretto più vicino, indipendentemente dalla taglia del token
  // (semplificazione voluta: lo snap "perfetto" per pedine 2x2+ è fuori scope per ora).
  private snapToGrid(value: number): number {
    const size = this.gridSize();
    return Math.round((value - size / 2) / size) * size + size / 2;
  }
}
