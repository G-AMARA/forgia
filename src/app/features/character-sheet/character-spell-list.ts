import { Component, inject } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterSpellsService } from './character-spells';
import { CharacterSpellCard } from './character-spell-card';

// Incantesimi conosciuti dal personaggio, raggruppati per livello.
@Component({
  selector: 'app-character-spell-list',
  imports: [CharacterSpellCard],
  templateUrl: './character-spell-list.html',
})
export class CharacterSpellList {
  protected context = inject(CharacterSheetContext);
  protected spells = inject(CharacterSpellsService);
  protected localeService = inject(LocaleService);
}
