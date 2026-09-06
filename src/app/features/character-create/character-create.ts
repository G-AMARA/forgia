import { Component, inject, signal } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { LocaleService } from '../../core/locale';
import { CharacterSheet } from '../character-sheet/character-sheet';
import { CharacterCreateForm } from './character-create-form';
import { ForgeClonesPanel } from './forge-clones-panel';

// "Fucina degli Eroi" (tab navbar "characters"): colonna sinistra con il parco personaggi
// dell'utente, colonna destra con la scheda dell'eroe selezionato o il form di creazione
// (CharacterCreateForm). Aggiungere un eroe a una campagna avviene altrove, dal picker
// "Aggiungi il tuo Eroe" in campaign-hub (vedi AddHeroModal).
@Component({
  selector: 'app-character-create',
  standalone: true,
  imports: [CharacterSheet, CharacterCreateForm, ForgeClonesPanel],
  templateUrl: './character-create.html',
})
export class CharacterCreate {
  protected characterStore = inject(CharacterStore);
  protected localeService = inject(LocaleService);
  // Per mostrare "∞" invece del numero quando il rango è Fato (CharacterStore.myCharacterLimit()).
  protected readonly Infinity = Infinity;

  protected selectedHeroId = signal<string | null>(null);
  protected creating = signal(false);

  constructor() {
    this.characterStore.loadMyRoster();
  }

  protected isSelected(heroId: string): boolean {
    return !this.creating() && this.selectedHeroId() === heroId;
  }

  protected selectHero(heroId: string) {
    this.creating.set(false);
    this.selectedHeroId.set(heroId);
  }

  protected startCreating() {
    this.creating.set(true);
  }

  protected onHeroCreated(characterId: string) {
    this.creating.set(false);
    this.selectedHeroId.set(characterId);
  }

  protected onCreationCancelled() {
    this.creating.set(false);
  }
}
