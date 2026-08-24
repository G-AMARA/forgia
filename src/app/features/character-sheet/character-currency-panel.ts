import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { getCoinImagePath } from '../../core/coin-images';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterInventoryService } from './character-inventory';

// Colore di ciascuna moneta per la variante "banner": niente immagine lì, solo il colore
// del metallo come sfondo del riquadro (vedi character-currency-panel.html).
export const COIN_COLORS: Record<string, string> = {
  copper: '#a15c2e',
  silver: '#8e8e93',
  electrum: '#a89968',
  gold: '#c9982e',
  platinum: '#9fb0b8',
};

// 5 riquadri valuta (rame/argento/electrum/oro/platino), in cima al tab Inventario. Due
// varianti grafiche: "grid" (riquadri con immagine di sfondo, scheda completa, default) e
// "banner" (righe impilate colorate per metallo, pannello compatto della pagina Gioca —
// PlayCharacterPanel, tramite CharacterInventoryTab.compact).
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
  protected coinColors = COIN_COLORS;

  readonly banner = input(false);
}
