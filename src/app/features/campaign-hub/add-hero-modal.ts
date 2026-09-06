import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { LocaleService } from '../../core/locale';
import { AppNav } from '../../core/app-nav';
import { Modal } from '../../core/modal';

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

  @Input({ required: true }) campaignId!: string;
  @Output() closed = new EventEmitter<void>();

  ngOnInit() {
    this.characterStore.loadMyRoster();
  }

  // PG base della Fucina: sempre selezionabili qui, anche se già usati in altre campagne
  // (ogni selezione ne clona lo stato attuale in una nuova riga per QUESTA campagna, vedi
  // CharacterStore.cloneCharacterToCampaign, il base resta invariato e riusabile).
  availableHeroes() {
    return this.characterStore.forgeBases();
  }

  async selectHero(characterId: string) {
    const { error } = await this.characterStore.cloneCharacterToCampaign(this.campaignId, characterId);
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
