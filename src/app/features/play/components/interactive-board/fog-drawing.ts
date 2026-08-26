import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { BoardViewport, WorldPoint } from './board-viewport';
import { FogOfWarStore, FogRect, FogState } from '../../fog-of-war-store';

export type FogMode = 'reveal' | 'cover' | null;

// Sotto questa dimensione (world px) il trascinamento è considerato un tap accidentale, non
// un rettangolo intenzionale: evita di rivelare/coprire un'area larga 0 con un click secco.
const MIN_RECT_SIZE = 4;

// Interazione di disegno rettangoli per la nebbia (Master, "Modalità Nebbia"): stato del
// disegno in corso + applicazione a FogOfWarStore. Estratto da InteractiveBoardComponent
// (già al limite di 200 righe) per lo stesso motivo di BoardViewport. Fornito nei
// `providers` del componente (non root): un'istanza per tabellone.
@Injectable()
export class FogDrawing {
  private viewport = inject(BoardViewport);
  private fogStore = inject(FogOfWarStore);
  private destroyRef = inject(DestroyRef);

  readonly mode = signal<FogMode>(null);
  readonly drawingRect = signal<FogRect | null>(null);
  // Popolato SOLO al termine di un disegno completato dall'utente LOCALE (mai da
  // FogOfWarStore.setLocal(), che arriva da un broadcast remoto): il componente lo osserva
  // per notificare Play, senza rischio di eco quando si applica invece un update remoto.
  readonly justEdited = signal<FogState | null>(null);

  private start: WorldPoint | null = null;
  private readonly onMove = (event: PointerEvent) => this.update(event);
  private readonly onUp = () => this.finish();

  constructor() {
    this.destroyRef.onDestroy(() => this.detachListeners());
  }

  setMode(mode: FogMode) {
    this.mode.set(mode);
    this.drawingRect.set(null);
    this.start = null;
  }

  begin(event: PointerEvent) {
    const world = this.viewport.screenToWorld(event.clientX, event.clientY);
    this.start = world;
    this.drawingRect.set({ x: world.x, y: world.y, w: 0, h: 0 });
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  private update(event: PointerEvent) {
    if (!this.start) return;
    const world = this.viewport.screenToWorld(event.clientX, event.clientY);
    this.drawingRect.set({
      x: Math.min(this.start.x, world.x),
      y: Math.min(this.start.y, world.y),
      w: Math.abs(world.x - this.start.x),
      h: Math.abs(world.y - this.start.y),
    });
  }

  private finish() {
    this.detachListeners();
    const rect = this.drawingRect();
    this.start = null;
    this.drawingRect.set(null);
    if (!rect || rect.w < MIN_RECT_SIZE || rect.h < MIN_RECT_SIZE) return;

    const state = this.mode() === 'cover' ? this.fogStore.cover(rect) : this.fogStore.reveal(rect);
    this.justEdited.set(state);
  }

  private detachListeners() {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
  }
}
