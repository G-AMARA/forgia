import { Injectable, signal } from '@angular/core';

export type Tab =
  | 'board'
  | 'hub'
  | 'campaign'
  | 'campaign-edit'
  | 'characters'
  | 'catalog'
  | 'character-sheet'
  | 'manage';

@Injectable({ providedIn: 'root' })
export class AppNav {
  activeTab = signal<Tab>('board');
  expandedCatalogSection = signal<string | null>('races');

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  toggleCatalogSection(section: string) {
    this.expandedCatalogSection.set(this.expandedCatalogSection() === section ? null : section);
  }
}
