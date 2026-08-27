import { Component, inject, input } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { SKILLS } from '../../core/skills';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterIdentityService } from './character-identity';
import { CharacterCombatService } from './character-combat';
import { CharacterPrivilegesService } from './character-privileges';
import { chunkIntoColumns, formatModifier } from './character-sheet.utils';

// Tabella competenze a 3 colonne, con checkbox competenza + stella Maestria (Expertise).
@Component({
  selector: 'app-character-skills-table',
  imports: [],
  templateUrl: './character-skills-table.html',
})
export class CharacterSkillsTable {
  protected context = inject(CharacterSheetContext);
  protected identity = inject(CharacterIdentityService);
  protected combat = inject(CharacterCombatService);
  protected privileges = inject(CharacterPrivilegesService);
  protected localeService = inject(LocaleService);

  // Vista sola lettura senza checkbox/stella Maestria, riga evidenziata in oro se la
  // competenza è posseduta: usata dal pannello compatto della pagina "Gioca"
  // (PlayCharacterPanel).
  readonly compact = input(false);

  protected allSkills = SKILLS;
  protected skillColumns = chunkIntoColumns(SKILLS, 3);
  protected formatModifier = formatModifier;
}
