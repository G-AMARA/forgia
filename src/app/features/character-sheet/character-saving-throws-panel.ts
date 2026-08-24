import { Component, inject } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterIdentityService } from './character-identity';
import { CharacterPrivilegesService } from './character-privileges';

// Tiri Salvezza e Scurovisione affiancati: estratto da CharacterCombatTab per essere
// riusabile anche nel pannello compatto della pagina "Gioca" (PlayCharacterPanel).
@Component({
  selector: 'app-character-saving-throws-panel',
  imports: [],
  templateUrl: './character-saving-throws-panel.html',
})
export class CharacterSavingThrowsPanel {
  protected context = inject(CharacterSheetContext);
  protected identity = inject(CharacterIdentityService);
  protected privileges = inject(CharacterPrivilegesService);
  protected localeService = inject(LocaleService);
}
