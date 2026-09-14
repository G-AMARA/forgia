import { Component, ElementRef, output, signal, viewChild } from '@angular/core';

// Parametri dello stick analogico (solo landscape, vedi sotto).
const RAGGIO_BASE = 48; // metà della base, w-24 = 96px nel template
const DEADZONE = 12; // soglia orizzontale sotto cui lo stick conta come "centrato"
const SOGLIA_TAP = 10; // distanza totale sotto cui un rilascio conta come "tocco" (potere)
const SOGLIA_SALTO = 30; // trascinamento verso l'alto necessario per il salto

// Due schemi di controllo touch alternativi per Dungeon Run, uno solo visibile per volta via
// media query CSS (nessun rilevamento orientamento in JS, vedi dungeon-touch-controls.html):
// - Verticale: D-pad esplicito (sinistra/destra tenuti premuti, su = salto) + tasto "F" per il
//   potere, sotto lo schermo di gioco. Più scopribile di un gesto, e c'è spazio sufficiente.
// - Orizzontale: l'altezza disponibile crolla (viewport basso) e i controlli devono
//   sovrapporsi al canvas per non spingere la pagina oltre il viewport (vedi commento in
//   dungeon-run.scss); un D-pad+F affiancati lì coprivano porzioni troppo ampie di mappa
//   (segnalato su device reale). Resta quindi lo stick analogico originale: un solo widget
//   compatto in un angolo, trascina per muoverti/saltare, tocca per il potere.
// Puramente presentazionale in entrambi i casi: la scena Phaser (dungeon-run-scene.ts)
// applica le stesse guardie di gioco che userebbe per l'input da tastiera.
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
  private direzioneStick: -1 | 0 | 1 = 0;

  protected premiSinistra() {
    this.move.emit(-1);
  }

  protected premiDestra() {
    this.move.emit(1);
  }

  // Chiamato dal rilascio di uno dei due tasti orizzontali: un solo dito alla volta preme
  // sinistra/destra in pratica, quindi fermare sempre il movimento al rilascio basta.
  protected rilasciaOrizzontale() {
    this.move.emit(0);
  }

  protected premiSu() {
    this.jump.emit();
  }

  protected premiAbilita() {
    this.ability.emit();
  }

  protected onStickPointerDown(event: PointerEvent) {
    event.preventDefault();
    this.puntatoreId = event.pointerId;
    this.base().nativeElement.setPointerCapture(event.pointerId);
    const rect = this.base().nativeElement.getBoundingClientRect();
    this.centro = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.saltoAttivato = false;
  }

  protected onStickPointerMove(event: PointerEvent) {
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
    if (nuovaDirezione !== this.direzioneStick) {
      this.direzioneStick = nuovaDirezione;
      this.move.emit(nuovaDirezione);
    }

    if (!this.saltoAttivato && dy < -SOGLIA_SALTO) {
      this.saltoAttivato = true;
      this.jump.emit();
    }
  }

  protected onStickPointerUp(event: PointerEvent) {
    if (event.pointerId !== this.puntatoreId) return;
    event.preventDefault();

    if (Math.hypot(this.stickX(), this.stickY()) < SOGLIA_TAP) {
      this.ability.emit();
    }

    this.puntatoreId = null;
    this.stickX.set(0);
    this.stickY.set(0);
    if (this.direzioneStick !== 0) {
      this.direzioneStick = 0;
      this.move.emit(0);
    }
  }
}
