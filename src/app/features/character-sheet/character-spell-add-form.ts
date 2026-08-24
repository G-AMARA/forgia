import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale';
import { CharacterSpellsService } from './character-spells';

// Ricerca + filtri (scuola/livello) + select per aggiungere un incantesimo dal catalogo
// di classe, tab Incantesimi.
@Component({
  selector: 'app-character-spell-add-form',
  imports: [FormsModule],
  templateUrl: './character-spell-add-form.html',
})
export class CharacterSpellAddForm {
  protected spells = inject(CharacterSpellsService);
  protected localeService = inject(LocaleService);
}
