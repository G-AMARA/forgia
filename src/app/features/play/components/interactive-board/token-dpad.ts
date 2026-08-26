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
}
