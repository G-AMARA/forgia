import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterIdentityService } from './character-identity';
import { CharacterCombatService } from './character-combat';
import { abilityModifier, formatModifier } from './character-sheet.utils';

// Riquadri PF / CA / Bonus Competenza / Iniziativa / Velocità, in cima al tab Combattimento.
// Due varianti grafiche: "grid" (riquadri quadrati, scheda completa, default) e "banner"
// (righe impilate, pannello compatto della pagina Gioca — PlayCharacterPanel).
@Component({
  selector: 'app-character-vital-stats',
  imports: [FormsModule],
  templateUrl: './character-vital-stats.html',
})
export class CharacterVitalStats {
  protected context = inject(CharacterSheetContext);
  protected identity = inject(CharacterIdentityService);
  protected combat = inject(CharacterCombatService);
  protected localeService = inject(LocaleService);
  protected abilityModifier = abilityModifier;
  protected formatModifier = formatModifier;

  readonly banner = input(false);
}
