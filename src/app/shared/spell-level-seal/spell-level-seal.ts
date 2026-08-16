import { Component, computed, input } from '@angular/core';
import { getSpellLevelTheme } from '../../core/spell-level-theme';

interface SealTick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Sigillo arcano riutilizzabile per tutti i livelli: stessa struttura (anelli + marker
// radiali + numero centrale), il numero di marker e il colore cambiano con il livello
// invece di avere un SVG dedicato per ognuno dei 10 livelli.
@Component({
  selector: 'app-spell-level-seal',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 40 40"
      [style.color]="theme().color"
      class="overflow-visible"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      <circle cx="20" cy="20" r="17.5" fill="none" stroke="currentColor" stroke-opacity="0.2" stroke-width="1" />
      <circle cx="20" cy="20" r="13.5" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.6" stroke-width="1" />
      @for (t of ticks(); track $index) {
        <line [attr.x1]="t.x1" [attr.y1]="t.y1" [attr.x2]="t.x2" [attr.y2]="t.y2" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.25" stroke-linecap="round" />
      }
      <text x="20" y="21" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-size="13" class="font-display">{{ label() }}</text>
    </svg>
  `,
})
export class SpellLevelSeal {
  level = input.required<number>();
  size = input(36);

  protected theme = computed(() => getSpellLevelTheme(this.level()));
  protected label = computed(() => (this.level() === 0 ? '0' : String(this.level())));
  protected ariaLabel = computed(() => `Livello ${this.level()}`);

  protected ticks = computed<SealTick[]>(() => {
    const count = this.level() === 0 ? 3 : Math.min(this.level(), 9);
    const rInner = 15.2;
    const rOuter = 17.9;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      return {
        x1: 20 + rInner * Math.cos(angle),
        y1: 20 + rInner * Math.sin(angle),
        x2: 20 + rOuter * Math.cos(angle),
        y2: 20 + rOuter * Math.sin(angle),
      };
    });
  });
}
