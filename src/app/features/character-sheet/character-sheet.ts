import { Component, OnInit, inject, input, signal } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterIdentityService } from './character-identity';
import { CharacterPrivilegesService } from './character-privileges';
import { CharacterEquipmentService } from './character-equipment';
import { CharacterCombatService } from './character-combat';
import { CharacterInventoryService } from './character-inventory';
import { CharacterSpellsService } from './character-spells';
import { CharacterWeaponsService } from './character-weapons';
import { CharacterDiaryService } from './character-diary';
import { CharacterSheetHeader } from './character-sheet-header';
import { CharacterSheetTabs } from './character-sheet-tabs';
import { CharacterSheetSaveButton } from './character-sheet-save-button';
import { CharacterGeneralTab } from './character-general-tab';
import { CharacterCombatTab } from './character-combat-tab';
import { CharacterInventoryTab } from './character-inventory-tab';
import { CharacterSpellsTab } from './character-spells-tab';
import { CharacterWeaponsTab } from './character-weapons-tab';
import { CharacterDiaryTab } from './character-diary-tab';
import { SubTab } from './character-sheet.types';

// Scheda personaggio: orchestratore. Fornisce nel proprio sotto-albero tutti i servizi
// che accentrano stato/logica per le 6 sotto-schede (vedi CharacterSheetContext e affini),
// e delega la UI di ciascuna ai relativi componenti dumb.
@Component({
  selector: 'app-character-sheet',
  imports: [
    CharacterSheetHeader,
    CharacterSheetTabs,
    CharacterSheetSaveButton,
    CharacterGeneralTab,
    CharacterCombatTab,
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
  templateUrl: './character-sheet.html',
})
export class CharacterSheet implements OnInit {
  protected context = inject(CharacterSheetContext);
  protected identity = inject(CharacterIdentityService);
  protected combat = inject(CharacterCombatService);
  protected inventory = inject(CharacterInventoryService);
  protected diary = inject(CharacterDiaryService);
  protected localeService = inject(LocaleService);

  // Se valorizzato (es. dalla rotta /scheda-personaggio/:id), la scheda mostra quel
  // personaggio specifico invece del personaggio dell'utente loggato nella campagna attiva.
  readonly characterId = input<string>();

  protected activeSubTab = signal<SubTab>('general');

  ngOnInit() {
    // Ricarica sempre all'apertura della scheda (non solo al cambio di campagna, l'unico
    // altro momento in cui CharacterStore la aggiorna da solo): senza, un rinominare razza/
    // sottoclasse/background/ecc. da Gestione mentre la campagna resta la stessa non si
    // vedrebbe finché non si ricarica l'intera pagina.
    this.context.load(this.characterId());
  }

  protected setSubTab(tab: SubTab) {
    this.activeSubTab.set(tab);
    // Caricato a parte (non nella query principale del personaggio): niente da fare
    // finché il tab non si apre davvero.
    const c = this.context.character();
    if (tab === 'diary' && c) {
      this.diary.load(c.id);
    }
  }

  protected saveActive() {
    switch (this.activeSubTab()) {
      case 'general':
        return this.identity.saveBackstory();
      case 'combat':
        return this.combat.saveCombat();
      case 'inventory':
        return this.inventory.saveCurrency();
      default:
        return;
    }
  }
}
