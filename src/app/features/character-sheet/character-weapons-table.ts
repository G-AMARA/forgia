import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { GenericModalComponent } from '../../shared/modal/generic-adviser-modal/generic-adviser-modal';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterWeaponsService } from './character-weapons';

// Tabella delle armi possedute: click su una riga per aprirne il dettaglio.
@Component({
  selector: 'app-character-weapons-table',
  imports: [FormsModule, GenericModalComponent],
  templateUrl: './character-weapons-table.html',
})
export class CharacterWeaponsTable {
  protected context = inject(CharacterSheetContext);
  protected weapons = inject(CharacterWeaponsService);
  protected localeService = inject(LocaleService);
}
