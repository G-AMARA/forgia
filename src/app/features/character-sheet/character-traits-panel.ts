import { Component } from '@angular/core';
import { CharacterAbilityScores } from './character-ability-scores';
import { CharacterPrivilegesPanel } from './character-privileges-panel';

// Metà sinistra del tab Generale: caselle caratteristica (sola lettura) + pannello
// "Privilegi e Tratti". Wrapper sottile: la logica vive nei due sotto-componenti, entrambi
// riusati anche dal pannello compatto della pagina Gioca (PlayCharacterPanel).
@Component({
  selector: 'app-character-traits-panel',
  imports: [CharacterAbilityScores, CharacterPrivilegesPanel],
  template: `
    <div class="flex flex-col gap-4">
      <app-character-ability-scores />
      <app-character-privileges-panel />
    </div>
  `,
})
export class CharacterTraitsPanel {}
