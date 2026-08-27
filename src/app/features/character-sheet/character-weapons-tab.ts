import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Card } from '../../shared/card/card';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterWeaponsService } from './character-weapons';
import { CharacterWeaponsTable } from './character-weapons-table';
import { CharacterWeaponDetail } from './character-weapon-detail';

// Tab Armi: form aggiungi arma, tabella armi possedute, pannello di dettaglio (desktop
// "libro" + card mobile) per la riga selezionata.
@Component({
  selector: 'app-character-weapons-tab',
  imports: [FormsModule, Card, CharacterWeaponsTable, CharacterWeaponDetail],
  templateUrl: './character-weapons-tab.html',
})
export class CharacterWeaponsTab {
  protected context = inject(CharacterSheetContext);
  protected weapons = inject(CharacterWeaponsService);
  protected localeService = inject(LocaleService);

  // Nasconde il form di aggiunta arma e riduce la tabella a nome + azione elimina: usato
  // dal pannello compatto della pagina "Gioca" (PlayCharacterPanel).
  readonly compact = input(false);

  // Illustrazione di sfondo del "libro" dettagli arma: cornice dorata + doppia pagina,
  // vedi .book-container in tailwind.css.
  protected weaponBookImage = 'themes/LIBRO.png';
}
