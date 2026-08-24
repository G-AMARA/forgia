import { Component, inject, input } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { getStatLabelImagePath } from '../../core/ability-images';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterIdentityService } from './character-identity';
import { ABILITY_KEYS, AbilityKey } from './character-sheet.types';
import { abilityModifier, formatModifier, modifierBadgeClass } from './character-sheet.utils';

// Icone per la variante "banner" (pannello di gioco): niente a che vedere con le
// illustrazioni di sfondo della variante "grid" (getStatLabelImagePath), sono scelte
// apposta più immediate a colpo d'occhio in un elenco stretto.
const ABILITY_ICONS: Record<AbilityKey, string> = {
  str: '💪',
  dex: '🏃',
  cos: '🌳',
  int: '🧠',
  wis: '📖',
  cha: '🎭',
};

// Punteggi di caratteristica (sola lettura): estratto da CharacterTraitsPanel. Due varianti
// grafiche: "grid" (riquadri quadrati con illustrazione di sfondo, scheda completa,
// default) e "banner" (righe impilate con icona, pannello compatto della pagina Gioca —
// PlayCharacterPanel, vedi character-ability-scores.html).
@Component({
  selector: 'app-character-ability-scores',
  imports: [],
  templateUrl: './character-ability-scores.html',
})
export class CharacterAbilityScores {
  protected context = inject(CharacterSheetContext);
  protected identity = inject(CharacterIdentityService);
  protected localeService = inject(LocaleService);

  protected abilityKeys = ABILITY_KEYS;
  protected getStatLabelImagePath = getStatLabelImagePath;
  protected abilityModifier = abilityModifier;
  protected formatModifier = formatModifier;
  protected modifierBadgeClass = modifierBadgeClass;

  readonly banner = input(false);

  protected abilityIcon(key: AbilityKey): string {
    return ABILITY_ICONS[key];
  }
}
