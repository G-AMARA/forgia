import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { CharacterIdentityService } from './character-identity';
import { ABILITY_KEYS } from './character-sheet.types';

// Punteggi caratteristica modificabili + bonus razziale (automatico) + bonus a scelta
// libera, dentro la modale identità: blocco separato perché già ampio di suo.
@Component({
  selector: 'app-character-ability-score-editor',
  imports: [FormsModule],
  templateUrl: './character-ability-score-editor.html',
})
export class CharacterAbilityScoreEditor {
  protected identity = inject(CharacterIdentityService);
  protected localeService = inject(LocaleService);
  protected abilityKeys = ABILITY_KEYS;
}
