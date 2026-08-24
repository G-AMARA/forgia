import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { CharacterIdentityService } from './character-identity';
import { CharacterPrivilegesService } from './character-privileges';
import { CharacterAbilityScoreEditor } from './character-ability-score-editor';
import { CharacterIdentityLineageFields } from './character-identity-lineage-fields';

// Modale di modifica identità: nome, razza/sottorazza, classe/sottoclasse, background,
// livello, allineamento, XP, sesso. I punteggi caratteristica + bonus sono delegati a
// CharacterAbilityScoreEditor, razza/classe/sottoclasse/background a
// CharacterIdentityLineageFields (blocchi separati, la modale superava le 100 righe).
@Component({
  selector: 'app-character-identity-modal',
  imports: [FormsModule, CharacterAbilityScoreEditor, CharacterIdentityLineageFields],
  templateUrl: './character-identity-modal.html',
})
export class CharacterIdentityModal {
  protected identity = inject(CharacterIdentityService);
  protected privileges = inject(CharacterPrivilegesService);
  protected localeService = inject(LocaleService);
}
