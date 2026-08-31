import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { BoardViewport, WorldPoint } from './board-viewport';

// Sotto questa distanza schermo, pointerdown->pointerup su una pedina è un tap (seleziona
// per il D-Pad) non un drag.
const TAP_THRESHOLD_PX = 8;

interface ScreenPoint {
  x: number;
  y: number;
}

export interface DraggingToken {
  id: string;
  x: number;
  y: number;
}

export type TokenDragResult =
  | { type: 'move'; tokenId: string; x: number; y: number }
  | { type: 'commit'; tokenId: string; x: number; y: number }
  | { type: 'tap'; tokenId: string };

// Drag/tap di una pedina: stato del trascinamento in corso + soglia tap-vs-drag. Estratto
// da InteractiveBoardComponent (già al limite di 200 righe) per lo stesso motivo di
// BoardViewport/FogDrawing. Fornito nei `providers` del componente: un'istanza per tabellone.
@Injectable()
export class TokenDrag {
  private viewport = inject(BoardViewport);
  private destroyRef = inject(DestroyRef);

  // Override locale della posizione durante il drag: il rendering lo usa invece di token.x/y.
  readonly draggingToken = signal<DraggingToken | null>(null);
  // Un risultato per volta: il componente lo consuma e lo azzera (vedi effect in
  // interactive-board.ts). 'move' durante il drag (mai un tap, vedi sotto), 'commit' al
  // rilascio di un drag vero, 'tap' al rilascio senza aver superato la soglia.
  readonly result = signal<TokenDragResult | null>(null);
  // true dal momento in cui il drag supera la soglia: il componente lo osserva per azzerare
  // la selezione D-Pad (l'anello non deve pulsare durante un trascinamento vero).
  readonly dragConfirmed = signal(false);

  private start: ScreenPoint | null = null;
  private last: ScreenPoint | null = null;
  private gridSize = 50;
  private readonly onMove = (event: PointerEvent) => this.move(event);
  private readonly onUp = () => this.end();

  constructor() {
    this.destroyRef.onDestroy(() => this.detach());
  }

  begin(event: PointerEvent, tokenId: string, gridSize: number) {
    const world = this.viewport.screenToWorld(event.clientX, event.clientY);
    this.gridSize = gridSize;
    this.start = { x: event.clientX, y: event.clientY };
    this.last = this.start;
    this.dragConfirmed.set(false);
    this.draggingToken.set({ id: tokenId, x: world.x, y: world.y });
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  private move(event: PointerEvent) {
    const dragging = this.draggingToken();
    if (!dragging) return;
    this.last = { x: event.clientX, y: event.clientY };
    // Niente evento finché non è chiaro che è un drag e non un tap: altrimenti un tap
    // lascerebbe una posizione "in volo" sugli altri client senza mai un committed:true.
    if (!this.exceedsThreshold()) return;

    this.dragConfirmed.set(true);
    const world = this.viewport.clampToBounds(this.viewport.screenToWorld(event.clientX, event.clientY));
    this.draggingToken.set({ id: dragging.id, x: world.x, y: world.y });
    this.result.set({ type: 'move', tokenId: dragging.id, x: world.x, y: world.y });
  }

  private end() {
    this.detach();
    const dragging = this.draggingToken();
    this.draggingToken.set(null);
    if (!dragging) return;

    if (!this.exceedsThreshold()) {
      this.result.set({ type: 'tap', tokenId: dragging.id });
      return;
    }

    // Aggancia al centro del quadretto più vicino, indipendentemente dalla taglia del token
    // (semplificazione voluta: lo snap "perfetto" per pedine 2x2+ è fuori scope per ora).
    const size = this.gridSize;
    const snap = (value: number) => Math.round((value - size / 2) / size) * size + size / 2;
    // Lo snap può spingere di mezza cella oltre il bordo: clampare di nuovo dopo l'aggancio.
    const snapped: WorldPoint = this.viewport.clampToBounds({ x: snap(dragging.x), y: snap(dragging.y) });
    this.result.set({ type: 'commit', tokenId: dragging.id, x: snapped.x, y: snapped.y });
  }

  private exceedsThreshold(): boolean {
    return !!this.start && !!this.last && Math.hypot(this.last.x - this.start.x, this.last.y - this.start.y) > TAP_THRESHOLD_PX;
  }

  private detach() {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
  }
}
