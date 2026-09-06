import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CharacterStore, CharacterSummary } from '../../core/character-store';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { Auth } from '../../core/auth';
import { getRankForSeconds } from '../../core/ranks';
import { getCardImagePath, getUnlockedCards } from '../../core/character-cards';

type EditStep = 'menu' | 'change-hero' | 'change-card';

// Menu "Modifica" sulla propria card nel roster di campaign-hub: cambia il PG clonato
// in campagna (sempre pescando dalla Fucina, come add-hero-modal), cambia la card di
// sfondo tra quelle sbloccate, o rimuove il PG dalla campagna. Sostituisce il vecchio
// bottone diretto "Rimuovi" per chi è owner del personaggio (non admin).
@Component({
  selector: 'app-edit-hero-modal',
  standalone: true,
  templateUrl: './edit-hero-modal.html',
})
export class EditHeroModal implements OnInit {
  protected characterStore = inject(CharacterStore);
  protected localeService = inject(LocaleService);
  private auth = inject(Auth);
  private modal = inject(Modal);

  @Input({ required: true }) campaignId!: string;
  @Input({ required: true }) character!: CharacterSummary;
  @Output() closed = new EventEmitter<void>();

  protected readonly getCardImagePath = getCardImagePath;

  protected step = signal<EditStep>('menu');

  protected readonly unlockedCards = computed(() => {
    const tier = getRankForSeconds(this.auth.navigationSeconds(), this.auth.isAdmin());
    return getUnlockedCards(tier);
  });

  // "Cambia personaggio" pesca da characterStore.forgeBases(), cioè la Fucina di CHI STA
  // USANDO il modal: ha senso solo sul proprio PG. Un admin che apre "Modifica" sulla card
  // di un altro giocatore vede quindi solo cambio card e rimozione, non questa opzione,
  // altrimenti finirebbe per clonarci dentro un proprio PG al posto di quello del giocatore.
  protected readonly isOwnHero = computed(() => this.character.owner_id === this.auth.user()?.id);

  ngOnInit() {
    this.characterStore.loadMyRoster();
  }

  availableHeroes() {
    return this.characterStore.forgeBases();
  }

  goToChangeHero() {
    this.step.set('change-hero');
  }

  goToChangeCard() {
    this.step.set('change-card');
  }

  backToMenu() {
    this.step.set('menu');
  }

  // Clona prima il nuovo PG e solo dopo cancella quello vecchio: se il clone fallisce
  // (rete, permessi) il giocatore non resta senza personaggio in campagna.
  async confirmChangeHero(newHeroId: string) {
    const { error: cloneError } = await this.characterStore.cloneCharacterToCampaign(
      this.campaignId,
      newHeroId,
      this.character.card_key
    );
    if (cloneError) {
      this.modal.error(cloneError.message);
      return;
    }

    const { error: deleteError } = await this.characterStore.deleteCharacter(this.character.id);
    if (deleteError) {
      this.modal.error(deleteError.message);
      return;
    }
    this.closed.emit();
  }

  async confirmChangeCard(cardKey: string) {
    const { error } = await this.characterStore.updateCardKey(this.character.id, cardKey);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    this.closed.emit();
  }

  async removeFromCampaign() {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_remove_hero_from_campaign')} "${this.character.name}"?`,
      {
        cancelLabel: this.localeService.t('cancel_button'),
        confirmLabel: this.localeService.t('confirm_remove_button_confirm'),
      }
    );
    if (!confirmed) return;

    const { error } = await this.characterStore.deleteCharacter(this.character.id);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    this.closed.emit();
    await this.modal.success(
      `${this.localeService.t('hero_removed_msg_1')} "${this.character.name}" ${this.localeService.t('hero_removed_msg_2')}`
    );
  }

  cancel() {
    this.closed.emit();
  }
}
