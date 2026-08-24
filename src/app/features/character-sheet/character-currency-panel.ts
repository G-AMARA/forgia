import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { getCoinImagePath } from '../../core/coin-images';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterInventoryService } from './character-inventory';

// 5 riquadri valuta (rame/argento/electrum/oro/platino), in cima al tab Inventario.
@Component({
  selector: 'app-character-currency-panel',
  imports: [FormsModule],
  templateUrl: './character-currency-panel.html',
})
export class CharacterCurrencyPanel {
  protected context = inject(CharacterSheetContext);
  protected inventory = inject(CharacterInventoryService);
  protected localeService = inject(LocaleService);
  protected getCoinImagePath = getCoinImagePath;
}
