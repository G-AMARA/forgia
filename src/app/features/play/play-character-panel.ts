import { Component, OnInit, inject, signal } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from '../character-sheet/character-sheet-context';
import { CharacterIdentityService } from '../character-sheet/character-identity';
import { CharacterPrivilegesService } from '../character-sheet/character-privileges';
import { CharacterEquipmentService } from '../character-sheet/character-equipment';
import { CharacterCombatService } from '../character-sheet/character-combat';
import { CharacterInventoryService } from '../character-sheet/character-inventory';
import { CharacterSpellsService } from '../character-sheet/character-spells';
import { CharacterWeaponsService } from '../character-sheet/character-weapons';
import { CharacterDiaryService } from '../character-sheet/character-diary';
import { CharacterVitalStats } from '../character-sheet/character-vital-stats';
import { CharacterAbilityScores } from '../character-sheet/character-ability-scores';
import { CharacterPrivilegesPanel } from '../character-sheet/character-privileges-panel';
import { CharacterSavingThrowsPanel } from '../character-sheet/character-saving-throws-panel';
import { CharacterSkillsTable } from '../character-sheet/character-skills-table';
import { CharacterResistancesTable } from '../character-sheet/character-resistances-table';
import { CharacterInventoryTab } from '../character-sheet/character-inventory-tab';
import { CharacterSpellsTab } from '../character-sheet/character-spells-tab';
import { CharacterWeaponsTab } from '../character-sheet/character-weapons-tab';
import { CharacterDiaryTab } from '../character-sheet/character-diary-tab';

type PlaySection = 'traits' | 'skills' | 'inventory' | 'spells' | 'weapons' | 'diary';

// Pannello compatto del proprio personaggio, colonna sinistra della pagina "Gioca": le
// statistiche vitali (PF/CA/Iniziativa/...) restano sempre visibili in cima, perché sono
// quelle che si guardano di continuo in combattimento; il resto sta in un accordion a
// sezioni per non dover scrollare tra dieci blocchi. Riusa gli stessi servizi e
// sotto-componenti della scheda completa (character-sheet/): qui cambia solo come sono
// organizzati e presentati, non la logica sottostante.
@Component({
  selector: 'app-play-character-panel',
  standalone: true,
  imports: [
    CharacterVitalStats,
    CharacterAbilityScores,
    CharacterPrivilegesPanel,
    CharacterSavingThrowsPanel,
    CharacterSkillsTable,
    CharacterResistancesTable,
    CharacterInventoryTab,
    CharacterSpellsTab,
    CharacterWeaponsTab,
    CharacterDiaryTab,
  ],
  providers: [
    CharacterSheetContext,
    CharacterIdentityService,
    CharacterPrivilegesService,
    CharacterEquipmentService,
    CharacterCombatService,
    CharacterInventoryService,
    CharacterSpellsService,
    CharacterWeaponsService,
    CharacterDiaryService,
  ],
  templateUrl: './play-character-panel.html',
})
export class PlayCharacterPanel implements OnInit {
  protected context = inject(CharacterSheetContext);
  protected localeService = inject(LocaleService);

  protected expandedSection = signal<PlaySection | null>(null);

  ngOnInit() {
    this.context.load(undefined);
  }

  toggleSection(section: PlaySection) {
    this.expandedSection.set(this.expandedSection() === section ? null : section);
  }
}
