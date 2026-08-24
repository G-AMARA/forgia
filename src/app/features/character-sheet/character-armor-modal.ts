import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { CharacterEquipmentService } from './character-equipment';
import { CharacterCombatService } from './character-combat';

// Modale di selezione armatura + scudo. Il salvataggio persiste in updateCombatStats
// (condiviso con PF/competenze/resistenze): per questo il bottone Salva delega a
// CharacterCombatService invece che a CharacterEquipmentService.
@Component({
  selector: 'app-character-armor-modal',
  imports: [FormsModule],
  templateUrl: './character-armor-modal.html',
})
export class CharacterArmorModal {
  protected equipment = inject(CharacterEquipmentService);
  protected combat = inject(CharacterCombatService);
  protected localeService = inject(LocaleService);
}
