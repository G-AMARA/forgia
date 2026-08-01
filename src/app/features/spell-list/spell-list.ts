import { Component, inject, computed, signal, Input, Output, EventEmitter } from '@angular/core';
import { ContentStore } from '../../core/content-store';
import { LocaleService } from '../../core/locale';

interface SpellGroup {
  level: number;
  label: string;
  spells: any[];
}

@Component({
  selector: 'app-spell-list',
  standalone: true,
  templateUrl: './spell-list.html',
})
export class SpellList {
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  @Input() expanded = false;
  @Output() toggle = new EventEmitter<void>();

  private spells = this.contentStore.getContent('spells');

  // Solo il primo gruppo (trucchetti) parte aperto, gli altri livelli sono chiusi di default
  private expandedLevels = signal<Set<number>>(new Set([0]));

  isLevelExpanded(level: number): boolean {
    return this.expandedLevels().has(level);
  }

  toggleLevel(level: number) {
    const current = new Set(this.expandedLevels());
    if (current.has(level)) {
      current.delete(level);
    } else {
      current.add(level);
    }
    this.expandedLevels.set(current);
  }

  groupedSpells = computed<SpellGroup[]>(() => {
    const all = this.spells();
    if (all.length === 0) return [];

    const groups = new Map<number, any[]>();
    for (const spell of all) {
      const level = spell.raw.level ?? 0;
      if (!groups.has(level)) groups.set(level, []);
      groups.get(level)!.push(spell);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, spells]) => ({
        level,
        label:
          level === 0
            ? this.localeService.t('cantrips_label')
            : `${this.localeService.t('spell_level_label')} ${level}`,
        spells,
      }));
  });

  isLoading = computed(() => this.spells().length === 0);

  description(spell: any): string {
    return spell.description ?? '';
  }
}
