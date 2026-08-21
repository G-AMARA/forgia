import { Component, input } from '@angular/core';

// Una riga statistica della card incantesimo (tempo di lancio/gittata/durata/effetto):
// icona proiettata via content projection (ognuna ha una forma SVG diversa, non vale la
// pena parametrizzarla) + valore/etichetta come input.
@Component({
  selector: 'app-spell-stat',
  imports: [],
  template: `
    <div class="flex min-w-0 items-start gap-1.5">
      <ng-content />
      <div class="min-w-0">
        <p class="font-data text-[11px] text-slate-200 truncate">{{ value() }}</p>
        <p class="text-[9px] uppercase tracking-wide text-slate-500 truncate">{{ label() }}</p>
      </div>
    </div>
  `,
})
export class CharacterSpellStat {
  readonly value = input.required<string>();
  readonly label = input.required<string>();
}
