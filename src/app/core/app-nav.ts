import { Injectable, signal } from '@angular/core';

export type Tab =
  | 'board'
  | 'hub'
  | 'campaign'
  | 'campaign-edit'
  | 'characters'
  | 'catalog'
  | 'character-sheet'
  | 'play'
  | 'manage'
  | 'profile';

// 'character-sheet' e 'play' non vengono persistite: sono derivate dall'URL
// (/scheda-personaggio/:id, /gioca/:campaignId), che app.ts già ripristina autonomamente
// al caricamento leggendo il path richiesto.
const STORAGE_KEY = 'fanta-active-tab';
const NON_PERSISTED_TABS: Tab[] = ['character-sheet', 'play'];

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
