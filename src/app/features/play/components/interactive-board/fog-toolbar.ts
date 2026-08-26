import { Component, inject, input, output } from '@angular/core';
import { LocaleService } from '../../../../core/locale';
import { FogMode } from './fog-drawing';

// Strumenti Master per la nebbia (Fase 3A): puramente presentazionale, ogni pulsante emette
// solo l'intento — stato del disegno e mutazioni restano in FogDrawing/FogOfWarStore, di cui
// questo componente non ha bisogno di sapere nulla.
@Component({
  selector: 'app-fog-toolbar',
  standalone: true,
  templateUrl: './fog-toolbar.html',
})
export class FogToolbarComponent {
  protected localeService = inject(LocaleService);

  readonly mode = input<FogMode>(null);

  readonly setMode = output<FogMode>();
  readonly resetFog = output<void>();

  // Ri-cliccare la modalità già attiva la disattiva: niente pulsante "esci" separato.
  protected toggle(next: FogMode) {
    this.setMode.emit(this.mode() === next ? null : next);
  }
}
