import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterInventoryService } from './character-inventory';

// Form "aggiungi oggetto" (ricerca + select + quantità) + tabella dell'inventario posseduto.
@Component({
  selector: 'app-character-inventory-list',
  imports: [FormsModule],
  templateUrl: './character-inventory-list.html',
})
export class CharacterInventoryList {
  protected context = inject(CharacterSheetContext);
  protected inventory = inject(CharacterInventoryService);
  protected localeService = inject(LocaleService);
}
