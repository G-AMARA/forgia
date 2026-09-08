import { Component, inject, signal, computed } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
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
  private modal = inject(Modal);
  // Per mostrare "∞" invece del numero quando il rango è Fato (CharacterStore.myCharacterLimit()).
  protected readonly Infinity = Infinity;

  protected selectedHeroId = signal<string | null>(null);
  protected creating = signal(false);

  protected selectedHero = computed(() =>
    this.characterStore.forgeBases().find((hero) => hero.id === this.selectedHeroId()) ?? null
  );

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

  protected async deleteHero(heroId: string, heroName: string) {
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_delete_hero')} "${heroName}"?`, {
      cancelLabel: this.localeService.t('cancel_button'),
      confirmLabel: this.localeService.t('confirm_delete_hero_button_confirm'),
    });
    if (!confirmed) return;

    const { error } = await this.characterStore.deleteCharacter(heroId);
    if (error) {
      this.modal.error(error.message);
      return;
    }

    this.selectedHeroId.set(null);
    await this.modal.success(
      `${this.localeService.t('hero_deleted_msg_1')} "${heroName}" ${this.localeService.t('hero_deleted_msg_2')}`
    );
  }
}
