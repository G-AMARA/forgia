import { Component, input } from '@angular/core';

// type = chiave inglese grezza (acid, fire, ...), stessa di core/damage-types.ts.
// Stesso pattern di SpellSchoolIcon: nessuna logica di traduzione qui, la label va
// già tradotta dal chiamante.
@Component({
  selector: 'app-damage-type-icon',
  standalone: true,
  templateUrl: './damage-type-icon.html',
})
export class DamageTypeIcon {
  type = input<string | null>(null);
  label = input('');
  size = input(18);
}
