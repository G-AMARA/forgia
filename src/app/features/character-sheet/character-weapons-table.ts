import { Component, inject } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterWeaponsService } from './character-weapons';

// Tabella delle armi possedute: click su una riga per aprirne il dettaglio.
@Component({
  selector: 'app-character-weapons-table',
  imports: [],
  templateUrl: './character-weapons-table.html',
})
export class CharacterWeaponsTable {
  protected context = inject(CharacterSheetContext);
  protected weapons = inject(CharacterWeaponsService);
  protected localeService = inject(LocaleService);
}
