import { Component } from '@angular/core';
import { Card } from '../../shared/card/card';
import { CharacterTraitsPanel } from './character-traits-panel';
import { CharacterInfoPanel } from './character-info-panel';
import { CharacterIdentityModal } from './character-identity-modal';

// Tab Generale: caratteristiche + privilegi/tratti (sinistra), info personaggio + storia
// (destra), più la modale di modifica identità.
@Component({
  selector: 'app-character-general-tab',
  imports: [Card, CharacterTraitsPanel, CharacterInfoPanel, CharacterIdentityModal],
  template: `
    <app-card>
      <div class="grid grid-cols-1 @4xl:grid-cols-2 gap-8 items-stretch">
        <app-character-traits-panel />
        <app-character-info-panel />
      </div>
    </app-card>
    <app-character-identity-modal />
  `,
})
export class CharacterGeneralTab {}
