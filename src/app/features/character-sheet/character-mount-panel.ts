import { Component, inject } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterEquipmentService } from './character-equipment';

// Riquadro cavalcatura/veicolo posseduto: stesso pattern di CharacterArmorPanel.
@Component({
  selector: 'app-character-mount-panel',
  imports: [],
  templateUrl: './character-mount-panel.html',
})
export class CharacterMountPanel {
  protected context = inject(CharacterSheetContext);
  protected equipment = inject(CharacterEquipmentService);
  protected localeService = inject(LocaleService);
}
