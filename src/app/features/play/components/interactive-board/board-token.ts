import { Component, input, output } from '@angular/core';
import { CampaignToken } from '../../../../core/campaign-tokens';
import { WorldPoint } from './board-viewport';

// Rendering di una singola pedina, estratto da InteractiveBoardComponent (che con il
// markup del token inline sforava il limite di 100 righe di template). Puramente
// presentazionale: permessi, posizione e classe del bordo sono già calcolati dal padre,
// che possiede tokens()/canDrag()/selectedTokenId().
@Component({
  selector: 'app-board-token',
  standalone: true,
  templateUrl: './board-token.html',
})
export class BoardTokenComponent {
  readonly token = input.required<CampaignToken>();
  readonly position = input.required<WorldPoint>();
  readonly size = input.required<number>();
  readonly borderClass = input.required<string>();
  readonly canDrag = input(false);
  readonly isSelected = input(false);
  readonly dimmed = input(false);
  // true solo per il proprio personaggio quando si trova in un'area di nebbia non rivelata:
  // resta visibile/selezionabile (bugfix: prima il giocatore perdeva il proprio token
  // finendo nel buio), ma con un indicatore visivo distinto da `dimmed` (quello è per i
  // token nascosti dal Master, un concetto diverso).
  readonly inFog = input(false);

  readonly pointerDown = output<PointerEvent>();
  readonly contextMenu = output<MouseEvent>();

  protected onDragStart(event: DragEvent) {
    event.preventDefault();
  }

  // Un click sulla pedina non deve mai risalire al wrapper della mappa, altrimenti la
  // deselezione "click sullo sfondo" (vedi InteractiveBoardComponent.onBoardClick)
  // scatterebbe anche cliccando direttamente sulla pedina appena selezionata.
  protected onClick(event: MouseEvent) {
    event.stopPropagation();
  }
}
