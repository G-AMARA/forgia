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
  | 'profile'
  | 'dungeon-exp';

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

  // Id dell'utente mostrato dalla tab 'profile': null = il proprio profilo (comportamento
  // di sempre). Valorizzato da openProfile() quando si atterra sulla scheda di un altro
  // utente (es. click su un nome nella modale Avventurieri).
  readonly viewedProfileId = signal<string | null>(null);

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    if (!NON_PERSISTED_TABS.includes(tab)) {
      sessionStorage.setItem(STORAGE_KEY, tab);
    }
  }

  // Apre la tab 'profile': senza argomenti mostra il proprio profilo (e resetta un'eventuale
  // scheda altrui rimasta impostata), con uno userId mostra la scheda pubblica di quell'utente.
  openProfile(userId: string | null = null) {
    this.viewedProfileId.set(userId);
    this.setTab('profile');
  }

  toggleCatalogSection(section: string) {
    this.expandedCatalogSection.set(this.expandedCatalogSection() === section ? null : section);
  }
}
