import { Component, input } from '@angular/core';

// school = valore grezzo inglese (spell.raw.school: abjuration, conjuration, ...),
// label = etichetta già tradotta da mostrare come aria-label (nessuna logica di
// traduzione qui, riusa quella che il chiamante ha già calcolato).
@Component({
  selector: 'app-spell-school-icon',
  standalone: true,
  templateUrl: './spell-school-icon.html',
})
export class SpellSchoolIcon {
  school = input<string | null>(null);
  label = input('');
  size = input(18);
}
