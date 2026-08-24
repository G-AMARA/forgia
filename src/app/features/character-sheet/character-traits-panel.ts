import { Component, inject, signal } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { getStatLabelImagePath } from '../../core/ability-images';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterIdentityService } from './character-identity';
import { CharacterPrivilegesService } from './character-privileges';
import { ABILITY_KEYS } from './character-sheet.types';
import { abilityModifier, formatModifier, modifierBadgeClass } from './character-sheet.utils';

// Caselle caratteristica (sola lettura) + pannello "Privilegi e Tratti" a tab interne
// (Razziali / Sottoclasse / Background), metà sinistra del tab Generale.
@Component({
  selector: 'app-character-traits-panel',
  imports: [],
  templateUrl: './character-traits-panel.html',
})
export class CharacterTraitsPanel {
  protected context = inject(CharacterSheetContext);
  protected identity = inject(CharacterIdentityService);
  protected privileges = inject(CharacterPrivilegesService);
  protected localeService = inject(LocaleService);

  protected abilityKeys = ABILITY_KEYS;
  protected getStatLabelImagePath = getStatLabelImagePath;
  protected abilityModifier = abilityModifier;
  protected formatModifier = formatModifier;
  protected modifierBadgeClass = modifierBadgeClass;

  protected privilegesTab = signal<'racial' | 'subclass' | 'background'>('racial');
}
