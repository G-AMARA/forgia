import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

export interface BoardTransform {
  x: number;
  y: number;
  scale: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
// Sensibilità dello zoom: deltaY tipico della rotellina è ~100 per "tacca".
const ZOOM_SENSITIVITY = 0.0015;
// Dimensioni di fallback finché l'immagine reale non ha finito il preload: evita un
// layout a size 0 nel frattempo.
const FALLBACK_IMAGE_SIZE = { width: 1600, height: 900 };

// Stato e logica di pan/zoom di InteractiveBoardComponent, isolati qui perché puramente
// geometrici e riutilizzabili senza toccare template o input/output del componente.
// Fornito nei `providers` del componente (non root): una istanza per ogni tabellone.
@Injectable()
export class BoardViewport {
  private destroyRef = inject(DestroyRef);

  readonly transform = signal<BoardTransform>({ x: 0, y: 0, scale: 1 });
  readonly isPanning = signal(false);
  readonly spacePressed = signal(false);
  // Risoluzione naturale dell'immagine: lo spazio "mondo" stabile in cui vivono le
  // coordinate dei token, indipendente dalla dimensione (variabile) del viewport.
  readonly naturalSize = signal(FALLBACK_IMAGE_SIZE);

  readonly cursorClass = computed(() => {
    if (this.isPanning()) return 'cursor-grabbing';
    return this.spacePressed() ? 'cursor-grab' : 'cursor-default';
  });

  // Vive qui (non in Play): in UI sta affiancato al pulsante di reset vista.
  readonly isFullscreen = signal(!!document.fullscreenElement);

  private element: HTMLDivElement | null = null;
  private panStart = { pointerX: 0, pointerY: 0, originX: 0, originY: 0 };
  // Dita attive sul touch: 1 dito = pan, 2 dita = pinch-to-zoom (vedi onPointerDown).
  private activeTouches = new Map<number, { x: number; y: number }>();
  private pinchStart: { distance: number; scale: number; midWorld: WorldPoint } | null = null;
  private readonly onPointerMove = (event: PointerEvent) => {
    if (this.activeTouches.has(event.pointerId)) {
      this.activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (this.activeTouches.size >= 2) {
      this.updatePinch();
      return;
    }
    this.pan(event);
  };
  private readonly onPointerUp = (event: PointerEvent) => {
    if (!this.activeTouches.has(event.pointerId)) {
      this.endPan();
      return;
    }
    this.activeTouches.delete(event.pointerId);
    this.pinchStart = null;
    if (this.activeTouches.size === 1) {
      const [remaining] = [...this.activeTouches.values()];
      this.beginPan(remaining.x, remaining.y);
    } else if (this.activeTouches.size === 0) {
      this.endPan();
    }
  };
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.code !== 'Space' || this.isTypingTarget(event.target) || event.repeat) return;
    event.preventDefault();
    this.spacePressed.set(true);
  };
  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (event.code !== 'Space') return;
    this.spacePressed.set(false);
  };

  private readonly onFullscreenChange = () => this.isFullscreen.set(!!document.fullscreenElement);

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    // Coerenza anche se il fullscreen cambia per vie diverse dal pulsante (ESC nativo, gesture).
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      document.removeEventListener('fullscreenchange', this.onFullscreenChange);
      this.detachPanListeners();
    });
  }

  attach(element: HTMLDivElement) {
    this.element = element;
  }

  async toggleFullscreen() {
    // Sull'elemento radice, non solo sul tabellone: così drawer e pulsanti restano
    // utilizzabili in fullscreen, non solo la mappa.
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }

  // Precarica l'immagine per conoscerne la risoluzione naturale e ricentra la vista.
  loadImage(imageUrl: string) {
    const probe = new Image();
    probe.onload = () => {
      this.naturalSize.set({ width: probe.naturalWidth, height: probe.naturalHeight });
      this.resetView();
    };
    probe.src = imageUrl;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const rect = this.element?.getBoundingClientRect();
    if (!rect) return;

    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const world = this.screenToWorld(event.clientX, event.clientY);

    const current = this.transform();
    const factor = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor));

    // Il punto sotto il cursore, in coordinate del mondo, deve restare invariato dopo lo zoom.
    this.transform.set({
      scale: nextScale,
      x: pointerX - world.x * nextScale,
      y: pointerY - world.y * nextScale,
    });
  }

  onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      this.activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);
      if (this.activeTouches.size === 2) {
        event.preventDefault();
        this.beginPinch();
      } else if (this.activeTouches.size === 1) {
        this.beginPan(event.clientX, event.clientY);
      }
      return;
    }

    const isMiddleButton = event.button === 1;
    const isSpaceDrag = event.button === 0 && this.spacePressed();
    if (!isMiddleButton && !isSpaceDrag) return;

    event.preventDefault();
    this.beginPan(event.clientX, event.clientY);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  resetView() {
    const rect = this.element?.getBoundingClientRect();
    const { width, height } = this.naturalSize();
    if (!rect || rect.width === 0 || rect.height === 0) {
      this.transform.set({ x: 0, y: 0, scale: 1 });
      return;
    }

    // Fit-to-viewport centrato: scala massima che fa stare l'intera mappa a schermo.
    const scale = Math.min(rect.width / width, rect.height / height);
    this.transform.set({
      scale,
      x: (rect.width - width * scale) / 2,
      y: (rect.height - height * scale) / 2,
    });
  }

  // Centro, in coordinate mondo, dell'area visibile: usato per piazzare una nuova pedina
  // dove si sta guardando, non al centro fisso della mappa.
  getViewportCenter(): WorldPoint {
    const rect = this.element?.getBoundingClientRect();
    if (!rect) {
      const { width, height } = this.naturalSize();
      return { x: width / 2, y: height / 2 };
    }
    return this.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  // Converte coordinate schermo in coordinate mondo (spazio di token.x/y), invertendo
  // l'attuale transform del board.
  screenToWorld(clientX: number, clientY: number): WorldPoint {
    const rect = this.element?.getBoundingClientRect();
    const current = this.transform();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - current.x) / current.scale,
      y: (clientY - rect.top - current.y) / current.scale,
    };
  }

  private beginPan(x: number, y: number) {
    this.isPanning.set(true);
    const current = this.transform();
    this.panStart = { pointerX: x, pointerY: y, originX: current.x, originY: current.y };
  }

  private beginPinch() {
    const points = [...this.activeTouches.values()];
    const midpoint = this.midpoint(points[0], points[1]);
    this.pinchStart = {
      distance: this.distanceBetween(points[0], points[1]),
      scale: this.transform().scale,
      midWorld: this.screenToWorld(midpoint.x, midpoint.y),
    };
    this.isPanning.set(false);
  }

  // Ancora al mondo il punto centrale iniziale del pinch: resta sotto le dita mentre
  // la distanza tra le dita (quindi la scala) cambia, esattamente come onWheel col cursore.
  private updatePinch() {
    if (!this.pinchStart) return;
    const points = [...this.activeTouches.values()];
    const distance = this.distanceBetween(points[0], points[1]);
    const midpoint = this.midpoint(points[0], points[1]);
    const rect = this.element?.getBoundingClientRect();
    if (!rect) return;

    const factor = distance / this.pinchStart.distance;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.pinchStart.scale * factor));
    this.transform.set({
      scale: nextScale,
      x: midpoint.x - rect.left - this.pinchStart.midWorld.x * nextScale,
      y: midpoint.y - rect.top - this.pinchStart.midWorld.y * nextScale,
    });
  }

  private distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1);
  }

  private midpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private pan(event: PointerEvent) {
    if (!this.isPanning()) return;
    const current = this.transform();
    this.transform.set({
      ...current,
      x: this.panStart.originX + (event.clientX - this.panStart.pointerX),
      y: this.panStart.originY + (event.clientY - this.panStart.pointerY),
    });
  }

  private endPan() {
    this.isPanning.set(false);
    this.detachPanListeners();
  }

  private detachPanListeners() {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || !!element?.isContentEditable;
  }
}
