import { Component, inject, input } from '@angular/core';
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

  // Mostra solo le resistenze già spuntate, senza checkbox: usato dal pannello compatto
  // della pagina "Gioca" (PlayCharacterPanel), dove la gestione resta nella scheda
  // personaggio completa.
  readonly compact = input(false);

  protected allDamageTypes = DAMAGE_TYPES;
  protected resistanceColumns = chunkIntoColumns(DAMAGE_TYPES, 3);
}
