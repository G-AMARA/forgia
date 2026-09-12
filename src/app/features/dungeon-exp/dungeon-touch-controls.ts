import { Component, ElementRef, output, signal, viewChild } from '@angular/core';

// Raggio massimo di trascinamento dello stick (metà della base, w-24 = 96px in template).
const RAGGIO_BASE = 48;
// Sotto questa soglia orizzontale lo stick conta come "centrato" (nessun movimento).
const DEADZONE = 12;
// Sotto questa distanza totale, un rilascio conta come "tocco" (attiva il potere) invece
// che come trascinamento.
const SOGLIA_TAP = 10;
// Trascinamento verticale verso l'alto necessario per attivare il salto.
const SOGLIA_SALTO = 30;

// Joystick virtuale per Dungeon Run su mobile (nessun modo di muoversi o usare il potere da
// telefono, senza tastiera): un solo widget copre movimento orizzontale (trascina),
// salto (trascina verso l'alto) e potere di classe (tocco senza trascinare), per non
// affollare lo schermo di più pulsanti separati. Puramente presentazionale: la scena Phaser
// (dungeon-run-scene.ts) applica le stesse guardie di gioco (blocked.down, abilitaPronta())
// che userebbe per l'input da tastiera.
@Component({
  selector: 'app-dungeon-touch-controls',
  standalone: true,
  templateUrl: './dungeon-touch-controls.html',
})
export class DungeonTouchControlsComponent {
  readonly move = output<-1 | 0 | 1>();
  readonly jump = output<void>();
  readonly ability = output<void>();

  protected readonly stickX = signal(0);
  protected readonly stickY = signal(0);

  private readonly base = viewChild.required<ElementRef<HTMLDivElement>>('base');

  private puntatoreId: number | null = null;
  private centro = { x: 0, y: 0 };
  private saltoAttivato = false;
  private direzioneCorrente: -1 | 0 | 1 = 0;

  protected onPointerDown(event: PointerEvent) {
    event.preventDefault();
    this.puntatoreId = event.pointerId;
    this.base().nativeElement.setPointerCapture(event.pointerId);
    const rect = this.base().nativeElement.getBoundingClientRect();
    this.centro = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.saltoAttivato = false;
  }

  protected onPointerMove(event: PointerEvent) {
    if (event.pointerId !== this.puntatoreId) return;
    event.preventDefault();

    let dx = event.clientX - this.centro.x;
    let dy = event.clientY - this.centro.y;
    const distanza = Math.hypot(dx, dy);
    if (distanza > RAGGIO_BASE) {
      dx = (dx / distanza) * RAGGIO_BASE;
      dy = (dy / distanza) * RAGGIO_BASE;
    }
    this.stickX.set(dx);
    this.stickY.set(dy);

    const nuovaDirezione = dx < -DEADZONE ? -1 : dx > DEADZONE ? 1 : 0;
    if (nuovaDirezione !== this.direzioneCorrente) {
      this.direzioneCorrente = nuovaDirezione;
      this.move.emit(nuovaDirezione);
    }

    if (!this.saltoAttivato && dy < -SOGLIA_SALTO) {
      this.saltoAttivato = true;
      this.jump.emit();
    }
  }

  protected onPointerUp(event: PointerEvent) {
    if (event.pointerId !== this.puntatoreId) return;
    event.preventDefault();

    if (Math.hypot(this.stickX(), this.stickY()) < SOGLIA_TAP) {
      this.ability.emit();
    }

    this.puntatoreId = null;
    this.stickX.set(0);
    this.stickY.set(0);
    if (this.direzioneCorrente !== 0) {
      this.direzioneCorrente = 0;
      this.move.emit(0);
    }
  }
}
