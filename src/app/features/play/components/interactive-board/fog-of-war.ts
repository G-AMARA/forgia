import { Component, computed, input } from '@angular/core';
import { FogOp, FogRect } from '../../fog-of-war-store';

let nextFogId = 0;

// Layer visivo della nebbia: un SVG <mask> (non un <path evenodd>) perché rettangoli
// rivelati sovrapposti tra loro devono restare semplicemente "rivelati", non ri-nascosti a
// vicenda (con evenodd, due rivelazioni sovrapposte si annullerebbero a vicenda nella zona
// di intersezione). Nessun viewBox: come la griglia in interactive-board.html, le coordinate
// sono px "mondo" 1:1 con la dimensione renderizzata dell'SVG (w-full h-full su .board).
//
// Le operazioni sono rese nella mask nello STESSO ordine cronologico in cui sono state
// disegnate (vedi .html): base bianca (nebbia ovunque), poi un rettangolo nero per ogni
// "reveal" o bianco per ogni "cover", in sequenza — l'ultima operazione che tocca un punto
// vince sempre, sia essa "copri" o "scopri" (bugfix: col vecchio modello a due liste
// raggruppate per tipo, "copri" vinceva sempre su "scopri" indipendentemente dall'ordine
// reale delle azioni).
@Component({
  selector: 'app-fog-of-war',
  standalone: true,
  templateUrl: './fog-of-war.html',
})
export class FogOfWarComponent {
  readonly operations = input.required<FogOp[]>();
  readonly isMaster = input(false);
  readonly drawingRect = input<FogRect | null>(null);

  protected readonly maskId = `fog-mask-${nextFogId++}`;
  // Master: nebbia semi-trasparente (riferimento visivo, vede comunque la mappa sotto).
  // Giocatore: nebbia opaca al 100%, non deve poter intuire cosa c'è sotto.
  protected fogColor = computed(() => (this.isMaster() ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,1)'));
}
