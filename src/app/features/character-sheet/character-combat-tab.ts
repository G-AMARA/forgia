import { Component, inject } from '@angular/core';
import { Card } from '../../shared/card/card';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterVitalStats } from './character-vital-stats';
import { CharacterSavingThrowsPanel } from './character-saving-throws-panel';
import { CharacterSkillsTable } from './character-skills-table';
import { CharacterResistancesTable } from './character-resistances-table';

// Tab Combattimento: statistiche vitali, tiri salvezza/scurovisione, competenze, resistenze.
@Component({
  selector: 'app-character-combat-tab',
  imports: [Card, CharacterVitalStats, CharacterSavingThrowsPanel, CharacterSkillsTable, CharacterResistancesTable],
  templateUrl: './character-combat-tab.html',
})
export class CharacterCombatTab {
  protected context = inject(CharacterSheetContext);
}
