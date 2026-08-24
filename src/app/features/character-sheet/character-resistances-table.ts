import { Component, inject } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { DAMAGE_TYPES } from '../../core/damage-types';
import { DamageTypeIcon } from '../../shared/damage-type-icon/damage-type-icon';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterCombatService } from './character-combat';
import { chunkIntoColumns } from './character-sheet.utils';

// Tabella resistenze ai danni a 3 colonne, stesso pattern di CharacterSkillsTable.
@Component({
  selector: 'app-character-resistances-table',
  imports: [DamageTypeIcon],
  templateUrl: './character-resistances-table.html',
})
export class CharacterResistancesTable {
  protected context = inject(CharacterSheetContext);
  protected combat = inject(CharacterCombatService);
  protected localeService = inject(LocaleService);

  protected resistanceColumns = chunkIntoColumns(DAMAGE_TYPES, 3);
}
