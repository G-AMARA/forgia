import { Component, DestroyRef, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { MapAlbumImage } from '../../../../core/map-albums';
import { LocaleService } from '../../../../core/locale';
import { CampaignToken, TokenPositionEvent } from '../../../../core/campaign-tokens';
import { BoardViewport, WorldPoint } from './board-viewport';
import { ScreenPoint, TokenContextMenuComponent } from './token-context-menu';
import { MonsterCardModalComponent } from '../monster-card-modal/monster-card-modal';

let nextBoardId = 0;

// Tabellone interattivo: pan/zoom locale (delegato a BoardViewport, vedi board-viewport.ts
// — istanza condivisa fornita da Play, non da questo componente: Bestiary e
// PlayCharacterPanel ne hanno bisogno per piazzare nuove pedine al centro del viewport
// visibile) e pedine sincronizzate (posizione persistita su Supabase al rilascio,
// movimento in diretta via broadcast — vedi TokenPositionEvent, gestito dal Play padre).
// Griglia, immagine e pedine condividono lo stesso wrapper .board trasformato via CSS nel
// template, quindi restano sempre agganciate tra loro qualunque sia lo stato di pan/zoom.
@Component({
  selector: 'app-interactive-board',
  standalone: true,
  imports: [TokenContextMenuComponent, MonsterCardModalComponent],
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
  // Emesso dopo una mutazione via menu contestuale (rimozione, lock, visibilità): Play la
  // riceve (tramite PlayMapPanel) e broadcasta 'tokens-changed' agli altri client.
  readonly tokensChanged = output<void>();

  // Override locale della posizione durante il drag di una pedina: il rendering usa
  // questo valore invece di token.x/y finché il drag non si conclude.
  protected draggingToken = signal<{ id: string; x: number; y: number } | null>(null);
  protected contextMenuToken = signal<{ token: CampaignToken; position: ScreenPoint } | null>(null);
  // "Carta del Mostro" (vedi MonsterCardModalComponent): puramente locale/presentazionale,
  // nessuna mutazione o sync realtime coinvolta, quindi non risale fino a Play.
  protected inspectedToken = signal<CampaignToken | null>(null);

  private viewportEl = viewChild<ElementRef<HTMLDivElement>>('viewportEl');

  protected readonly gridPatternId = `board-grid-${nextBoardId++}`;

  private readonly onTokenPointerMove = (event: PointerEvent) => this.dragToken(event);
  private readonly onTokenPointerUp = () => this.dropToken();

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

  // Posizione effettiva da renderizzare: quella del drag in corso se questa pedina è
  // quella trascinata, altrimenti quella nota (DB o ricevuta via broadcast dal Play padre).
  protected tokenPosition(token: CampaignToken): WorldPoint {
    const dragging = this.draggingToken();
    return dragging && dragging.id === token.id ? { x: dragging.x, y: dragging.y } : { x: token.x, y: token.y };
  }

  protected tokenBorderClass(token: CampaignToken): string {
    if (token.characterId && token.characterId === this.myCharacterId()) return 'border-amber-400';
    if (token.characterId === null) return 'border-red-500';
    return 'border-slate-400';
  }

  protected canDrag(token: CampaignToken): boolean {
    if (this.isMaster()) return true;
    const myId = this.myCharacterId();
    return !token.isLocked && myId !== null && token.characterId === myId;
  }

  // A differenza di canDrag(), la rimozione non è bloccata da is_locked: un giocatore può
  // sempre togliere dalla plancia la pedina del proprio personaggio.
  protected canRemoveToken(token: CampaignToken): boolean {
    if (this.isMaster()) return true;
    const myId = this.myCharacterId();
    return myId !== null && token.characterId === myId;
  }

  protected onTokenContextMenu(event: MouseEvent, token: CampaignToken) {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuToken.set({ token, position: { x: event.clientX, y: event.clientY } });
  }

  protected onInspectToken(token: CampaignToken) {
    this.inspectedToken.set(token);
  }

  protected onTokenPointerDown(event: PointerEvent, token: CampaignToken) {
    // Solo il tasto sinistro trascina una pedina: il tasto centrale sopra una pedina deve
    // poter comunque avviare il pan della mappa (vedi BoardViewport.onPointerDown).
    if (event.button !== 0 || !this.canDrag(token)) return;

    // Impedisce che l'evento risalga fino al listener di pan sul viewport: trascinare una
    // pedina non deve mai muovere anche la mappa sotto di essa.
    event.stopPropagation();
    event.preventDefault();

    const world = this.viewport.screenToWorld(event.clientX, event.clientY);
    this.draggingToken.set({ id: token.id, x: world.x, y: world.y });
    window.addEventListener('pointermove', this.onTokenPointerMove);
    window.addEventListener('pointerup', this.onTokenPointerUp);
  }

  private dragToken(event: PointerEvent) {
    const dragging = this.draggingToken();
    if (!dragging) return;
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

    // L'emit avviene PRIMA di svuotare draggingToken: Play applica subito la posizione
    // finale a livePositions in modo sincrono (vedi Play.onTokenPositionChange), quindi
    // quando il rendering smette di usare draggingToken() cade già sul valore corretto
    // invece che sul vecchio token.x/y ancora non aggiornato da DB.
    const snapped = { x: this.snapToGrid(dragging.x), y: this.snapToGrid(dragging.y) };
    this.tokenPositionChange.emit({ tokenId: dragging.id, x: snapped.x, y: snapped.y, committed: true });
    this.draggingToken.set(null);
  }

  private detachTokenDragListeners() {
    window.removeEventListener('pointermove', this.onTokenPointerMove);
    window.removeEventListener('pointerup', this.onTokenPointerUp);
  }

  // Aggancia al centro del quadretto più vicino, indipendentemente dalla taglia del token
  // (semplificazione voluta: lo snap "perfetto" per pedine 2x2+ è fuori scope per ora).
  private snapToGrid(value: number): number {
    const size = this.gridSize();
    return Math.round((value - size / 2) / size) * size + size / 2;
  }
}
