import { Component, input } from '@angular/core';
import { TraitBlock } from '../../core/bestiary-store';

// Le 7 sezioni del blocco statistiche (tratti speciali, azioni, azioni bonus, reazioni,
// azioni leggendarie, azioni della tana, effetti regionali) hanno tutte la stessa forma
// "titolo + lista di {nome, descrizione}": un solo componente riusato 7 volte in
// monster-detail-card.html invece di ripetere lo stesso blocco @for sette volte.
@Component({
  selector: 'app-monster-trait-list',
  standalone: true,
  template: `
    @if (items().length > 0) {
      <div class="space-y-1">
        <h5 class="font-display text-sm text-fantasy-gold">{{ title() }}</h5>
        @for (item of items(); track $index) {
          <p class="text-sm"><span class="font-semibold italic">{{ item.name }}.</span> {{ item.description }}</p>
        }
      </div>
    }
  `,
})
export class MonsterTraitList {
  readonly title = input.required<string>();
  readonly items = input.required<TraitBlock[]>();
}
