import { Component, inject, input } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { getSpellLevelTheme } from '../../core/spell-level-theme';
import { SpellLevelSeal } from '../../shared/spell-level-seal/spell-level-seal';
import { SpellSchoolIcon } from '../../shared/spell-school-icon/spell-school-icon';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterSpellsService } from './character-spells';
import { CharacterSpellStat } from './character-spell-stat';

// Card di un singolo incantesimo conosciuto (tab Incantesimi): scuola, livello, statistiche
// rapide, descrizione, checkbox preparato + rimuovi. Riceve i dati già arricchiti da
// CharacterSpellsService.groupedCharacterSpells().
@Component({
  selector: 'app-character-spell-card',
  imports: [SpellLevelSeal, SpellSchoolIcon, CharacterSpellStat],
  templateUrl: './character-spell-card.html',
})
export class CharacterSpellCard {
  protected context = inject(CharacterSheetContext);
  protected spells = inject(CharacterSpellsService);
  protected localeService = inject(LocaleService);
  protected getSpellLevelTheme = getSpellLevelTheme;

  readonly spell = input.required<{
    rowId: string; name: string; level: number; school: string; schoolRaw: string;
    castingTime: string | null; range: string | null; duration: string | null;
    damageEffect: string | null; description: string | null; prepared: boolean;
  }>();
}
