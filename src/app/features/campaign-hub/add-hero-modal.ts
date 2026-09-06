import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { LocaleService } from '../../core/locale';
import { AppNav } from '../../core/app-nav';
import { Modal } from '../../core/modal';
import { Auth } from '../../core/auth';
import { getRankForSeconds } from '../../core/ranks';
import { getCardImagePath, getUnlockedCards } from '../../core/character-cards';

@Component({
  selector: 'app-add-hero-modal',
  standalone: true,
  templateUrl: './add-hero-modal.html',
})
export class AddHeroModal implements OnInit {
  protected characterStore = inject(CharacterStore);
  protected localeService = inject(LocaleService);
  private appNav = inject(AppNav);
  private modal = inject(Modal);
  private auth = inject(Auth);

  @Input({ required: true }) campaignId!: string;
  @Output() closed = new EventEmitter<void>();

  protected readonly getCardImagePath = getCardImagePath;

  // Wizard a due passi: prima si sceglie il PG base della Fucina, poi la card di sfondo
  // da mostrare nel roster di campaign-hub (solo quelle sbloccate per il proprio rango).
  protected step = signal<'hero' | 'card'>('hero');
  protected selectedHeroId = signal<string | null>(null);

  protected readonly unlockedCards = computed(() => {
    const tier = getRankForSeconds(this.auth.navigationSeconds(), this.auth.isAdmin());
    return getUnlockedCards(tier);
  });

  ngOnInit() {
    this.characterStore.loadMyRoster();
  }

  // PG base della Fucina: sempre selezionabili qui, anche se già usati in altre campagne
  // (ogni selezione ne clona lo stato attuale in una nuova riga per QUESTA campagna, vedi
  // CharacterStore.cloneCharacterToCampaign, il base resta invariato e riusabile).
  availableHeroes() {
    return this.characterStore.forgeBases();
  }

  chooseHero(characterId: string) {
    this.selectedHeroId.set(characterId);
    this.step.set('card');
  }

  backToHeroStep() {
    this.step.set('hero');
  }

  async confirmCard(cardKey: string) {
    const heroId = this.selectedHeroId();
    if (!heroId) return;

    const { error } = await this.characterStore.cloneCharacterToCampaign(this.campaignId, heroId, cardKey);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    this.closed.emit();
  }

  goToCharacterFactory() {
    this.appNav.setTab('characters');
    this.closed.emit();
  }

  cancel() {
    this.closed.emit();
  }
}
