import { Injectable, signal } from '@angular/core';

export type Tab =
  | 'board'
  | 'hub'
  | 'campaign'
  | 'campaign-edit'
  | 'characters'
  | 'catalog'
  | 'character-sheet'
  | 'manage'
  | 'profile';

// 'character-sheet' non viene persistita: è derivata dall'URL (/scheda-personaggio/:id),
// che app.ts già ripristina autonomamente al caricamento leggendo il path richiesto.
const STORAGE_KEY = 'fanta-active-tab';
const NON_PERSISTED_TABS: Tab[] = ['character-sheet'];

function readStoredTab(): Tab {
  const stored = sessionStorage.getItem(STORAGE_KEY) as Tab | null;
  return stored && !NON_PERSISTED_TABS.includes(stored) ? stored : 'board';
}

@Injectable({ providedIn: 'root' })
export class AppNav {
  activeTab = signal<Tab>(readStoredTab());
  expandedCatalogSection = signal<string | null>('races');

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    if (!NON_PERSISTED_TABS.includes(tab)) {
      sessionStorage.setItem(STORAGE_KEY, tab);
    }
  }

  toggleCatalogSection(section: string) {
    this.expandedCatalogSection.set(this.expandedCatalogSection() === section ? null : section);
  }
}
