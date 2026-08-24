import { Component, inject } from '@angular/core';
import { Card } from '../../shared/card/card';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterSpellsService } from './character-spells';
import { CharacterSpellAddForm } from './character-spell-add-form';
import { CharacterSpellList } from './character-spell-list';

// Tab Incantesimi: box info slot/trucchetti, form di aggiunta, elenco conosciuti.
@Component({
  selector: 'app-character-spells-tab',
  imports: [Card, CharacterSpellAddForm, CharacterSpellList],
  templateUrl: './character-spells-tab.html',
})
export class CharacterSpellsTab {
  protected context = inject(CharacterSheetContext);
  protected spells = inject(CharacterSpellsService);
  protected localeService = inject(LocaleService);
}
