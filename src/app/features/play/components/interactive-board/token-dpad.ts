import { Component, output } from '@angular/core';

// Widget flottante mobile per spostare la pedina selezionata (FIX 2, vedi
// InteractiveBoardComponent.selectedToken): puramente presentazionale, ogni pulsante
// emette solo l'intento — il calcolo di destinazione/permessi/persistenza resta nel padre,
// che già possiede tokens()/gridSize()/canDrag().
@Component({
  selector: 'app-token-dpad',
  standalone: true,
  templateUrl: './token-dpad.html',
})
export class TokenDpadComponent {
  readonly move = output<{ dx: number; dy: number }>();
  readonly confirm = output<void>();

  // stopPropagation: senza, il click sul D-Pad risale a InteractiveBoardComponent (il
  // click "sullo sfondo" che deseleziona, vedi onBoardClick) — il D-Pad sparirebbe subito
  // dopo il primo tap su una freccia invece di restare per spostamenti successivi.
  protected onMove(event: Event, dx: number, dy: number) {
    event.preventDefault();
    event.stopPropagation();
    this.move.emit({ dx, dy });
  }

  protected onConfirm(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.confirm.emit();
  }
}
