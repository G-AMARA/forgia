import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterIdentityService } from './character-identity';
import { CharacterPrivilegesService } from './character-privileges';

// Card informazioni personaggio (sola lettura, si modifica dalla modale identità) +
// textarea Storia, metà destra del tab Generale.
@Component({
  selector: 'app-character-info-panel',
  imports: [FormsModule],
  templateUrl: './character-info-panel.html',
})
export class CharacterInfoPanel {
  protected context = inject(CharacterSheetContext);
  protected identity = inject(CharacterIdentityService);
  protected privileges = inject(CharacterPrivilegesService);
  protected localeService = inject(LocaleService);
}
