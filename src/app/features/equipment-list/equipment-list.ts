import { Component, inject, computed, signal, Input, Output, EventEmitter } from '@angular/core';
import { ContentStore } from '../../core/content-store';
import { LocaleService } from '../../core/locale';

interface EquipmentGroup {
  type: string;
  items: any[];
}

@Component({
  selector: 'app-equipment-list',
  standalone: true,
  templateUrl: './equipment-list.html',
})
export class EquipmentList {
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  @Input() expanded = false;
  @Output() toggle = new EventEmitter<void>();

  private equipment = this.contentStore.getContent('equipment');

  private expandedTypes = signal<Set<string>>(new Set());

  isTypeExpanded(type: string): boolean {
    return this.expandedTypes().has(type);
  }

  toggleType(type: string) {
    const current = new Set(this.expandedTypes());
    if (current.has(type)) {
      current.delete(type);
    } else {
      current.add(type);
    }
    this.expandedTypes.set(current);
  }

  groupedEquipment = computed<EquipmentGroup[]>(() => {
    const all = this.equipment();
    if (all.length === 0) return [];

    const groups = new Map<string, any[]>();
    for (const item of all) {
      const type = item.raw.type ?? 'Altro';
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(item);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, items]) => ({ type, items }));
  });

  isLoading = computed(() => this.equipment().length === 0);

  formatCost(item: any): string {
    const cost = item.raw.cost;
    if (!cost) return '—';
    return `${cost.quantity} mo`;
  }

  formatWeight(item: any): string | null {
    const lb = item.raw.weight;
    if (!lb) return null;
    const kg = (lb * 0.453592).toFixed(1);
    return `${kg} kg`;
  }
}
