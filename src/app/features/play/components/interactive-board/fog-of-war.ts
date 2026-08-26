import { Component, computed, input } from '@angular/core';
import { FogRect } from '../../fog-of-war-store';

let nextFogId = 0;

// Layer visivo della nebbia: un SVG <mask> (non un <path evenodd>) perché rettangoli
// rivelati sovrapposti tra loro devono restare semplicemente "rivelati", non ri-nascosti a
// vicenda (con evenodd, due rivelazioni sovrapposte si annullerebbero a vicenda nella zona
// di intersezione). Nessun viewBox: come la griglia in interactive-board.html, le coordinate
// sono px "mondo" 1:1 con la dimensione renderizzata dell'SVG (w-full h-full su .board).
//
// Due liste, disegnate in ordine nella mask (vedi .html): base bianca (nebbia ovunque),
// revealedAreas neri (bucano la nebbia), coveredAreas bianchi SOPRA (ri-chiudono solo la
// porzione toccata, senza cancellare il resto del buco sottostante — questo è il bugfix:
// "coprire" non tocca più revealedAreas).
@Component({
  selector: 'app-fog-of-war',
  standalone: true,
  templateUrl: './fog-of-war.html',
})
export class FogOfWarComponent {
  readonly revealedAreas = input.required<FogRect[]>();
  readonly coveredAreas = input<FogRect[]>([]);
  readonly isMaster = input(false);
  readonly drawingRect = input<FogRect | null>(null);

  protected readonly maskId = `fog-mask-${nextFogId++}`;
  // Master: nebbia semi-trasparente (riferimento visivo, vede comunque la mappa sotto).
  // Giocatore: nebbia opaca al 100%, non deve poter intuire cosa c'è sotto.
  protected fogColor = computed(() => (this.isMaster() ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,1)'));
}
