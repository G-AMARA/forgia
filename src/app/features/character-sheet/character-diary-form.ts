import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { CharacterDiaryService } from './character-diary';

// Form di scrittura/modifica di una pagina di diario: data, titolo opzionale, testo.
@Component({
  selector: 'app-character-diary-form',
  imports: [FormsModule],
  templateUrl: './character-diary-form.html',
})
export class CharacterDiaryForm {
  protected diary = inject(CharacterDiaryService);
  protected localeService = inject(LocaleService);
}
