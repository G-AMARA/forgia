import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { CharacterIdentityService } from './character-identity';
import { CharacterPrivilegesService } from './character-privileges';

// Select razza/sottorazza/classe/sottoclasse/background (+ descrizione), dentro la modale
// identità: blocco separato perché la modale superava le 100 righe di suo.
@Component({
  selector: 'app-character-identity-lineage-fields',
  imports: [FormsModule],
  templateUrl: './character-identity-lineage-fields.html',
})
export class CharacterIdentityLineageFields {
  protected identity = inject(CharacterIdentityService);
  protected privileges = inject(CharacterPrivilegesService);
  protected localeService = inject(LocaleService);
}
