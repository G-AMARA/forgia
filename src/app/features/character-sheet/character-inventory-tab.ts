import { Component } from '@angular/core';
import { Card } from '../../shared/card/card';
import { CharacterCurrencyPanel } from './character-currency-panel';
import { CharacterArmorPanel } from './character-armor-panel';
import { CharacterMountPanel } from './character-mount-panel';
import { CharacterInventoryList } from './character-inventory-list';
import { CharacterArmorModal } from './character-armor-modal';
import { CharacterMountModal } from './character-mount-modal';

// Tab Inventario: valuta, armatura/cavalcatura indossate, lista oggetti, + le due modali
// di selezione armatura e cavalcatura.
@Component({
  selector: 'app-character-inventory-tab',
  imports: [
    Card,
    CharacterCurrencyPanel,
    CharacterArmorPanel,
    CharacterMountPanel,
    CharacterInventoryList,
    CharacterArmorModal,
    CharacterMountModal,
  ],
  template: `
    <app-card contentClass="space-y-4">
      <app-character-currency-panel />
      <div class="border-t border-gold/20 pt-5 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        <div class="flex flex-col gap-6">
          <app-character-armor-panel />
          <app-character-mount-panel />
        </div>
        <app-character-inventory-list />
      </div>
    </app-card>
    <app-character-armor-modal />
    <app-character-mount-modal />
  `,
})
export class CharacterInventoryTab {}
