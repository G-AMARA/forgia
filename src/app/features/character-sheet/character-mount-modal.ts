import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { CharacterEquipmentService } from './character-equipment';

// Modale di selezione cavalcatura/veicolo.
@Component({
  selector: 'app-character-mount-modal',
  imports: [FormsModule],
  templateUrl: './character-mount-modal.html',
})
export class CharacterMountModal {
  protected equipment = inject(CharacterEquipmentService);
  protected localeService = inject(LocaleService);
}
