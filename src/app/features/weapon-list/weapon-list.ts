import { Component, inject, computed, signal, Input, Output, EventEmitter } from '@angular/core';
import { ContentStore } from '../../core/content-store';
import { LocaleService } from '../../core/locale';

interface WeaponGroup {
  category: string;
  weapons: any[];
}

@Component({
  selector: 'app-weapon-list',
  standalone: true,
  templateUrl: './weapon-list.html',
})
export class WeaponList {
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  @Input() expanded = false;
  @Output() toggle = new EventEmitter<void>();

  private weapons = this.contentStore.getContent('weapons');

  private expandedCategories = signal<Set<string>>(new Set(['melee']));

  isCategoryExpanded(category: string): boolean {
    return this.expandedCategories().has(category);
  }

  toggleCategory(category: string) {
    const current = new Set(this.expandedCategories());
    if (current.has(category)) {
      current.delete(category);
    } else {
      current.add(category);
    }
    this.expandedCategories.set(current);
  }

  groupedWeapons = computed<WeaponGroup[]>(() => {
    const all = this.weapons();
    if (all.length === 0) return [];

    const groups = new Map<string, any[]>();
    for (const w of all) {
      const category = w.raw.range_category === 'ranged' ? 'ranged' : 'melee';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(w);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, weapons]) => ({ category, weapons }));
  });

  isLoading = computed(() => this.weapons().length === 0);

  categoryLabel(category: string): string {
    return category === 'ranged'
      ? this.localeService.t('weapon_range_ranged')
      : this.localeService.t('weapon_range_melee');
  }

  attackAbilityNames(abilities: string[]): string {
    return (abilities ?? [])
      .map((a) => this.localeService.t('ability_' + a))
      .join(' ' + this.localeService.t('or_label') + ' ');
  }

  damageLine(w: any): string {
    const r = w.raw;
    let line = `${r.damage_dice ?? ''} ${r.damage_type ?? ''}`.trim();
    if (r.versatile_damage) {
      line += ` (${r.versatile_damage} ${this.localeService.t('weapon_versatile_label')})`;
    }
    return line;
  }

  rangeLine(w: any): string | null {
    const r = w.raw;
    if (r.range_category === 'ranged' && r.normal_range) {
      return `${r.normal_range}/${r.long_range} m`;
    }
    return null;
  }
}
