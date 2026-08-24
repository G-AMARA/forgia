import { Component, inject, input } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterEquipmentService } from './character-equipment';
import { CharacterInventoryService } from './character-inventory';

// Riquadro armatura indossata: nome, immagine dal catalogo, peso totale trasportato.
@Component({
  selector: 'app-character-armor-panel',
  imports: [],
  templateUrl: './character-armor-panel.html',
})
export class CharacterArmorPanel {
  protected context = inject(CharacterSheetContext);
  protected equipment = inject(CharacterEquipmentService);
  protected inventory = inject(CharacterInventoryService);
  protected localeService = inject(LocaleService);

  // Nasconde l'immagine dell'armatura: usato dal pannello compatto della pagina "Gioca"
  // (PlayCharacterPanel), dove lo spazio è ridotto e conta solo sapere cosa si indossa.
  readonly compact = input(false);
}
