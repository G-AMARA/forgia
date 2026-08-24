import { Component, inject } from '@angular/core';
import { Card } from '../../shared/card/card';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterIdentityService } from './character-identity';
import { CharacterPrivilegesService } from './character-privileges';
import { CharacterVitalStats } from './character-vital-stats';
import { CharacterSkillsTable } from './character-skills-table';
import { CharacterResistancesTable } from './character-resistances-table';

// Tab Combattimento: statistiche vitali, tiri salvezza/scurovisione, competenze, resistenze.
@Component({
  selector: 'app-character-combat-tab',
  imports: [Card, CharacterVitalStats, CharacterSkillsTable, CharacterResistancesTable],
  templateUrl: './character-combat-tab.html',
})
export class CharacterCombatTab {
  protected context = inject(CharacterSheetContext);
  protected identity = inject(CharacterIdentityService);
  protected privileges = inject(CharacterPrivilegesService);
  protected localeService = inject(LocaleService);
}
