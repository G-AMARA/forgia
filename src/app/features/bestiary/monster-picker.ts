import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { BestiaryMonster, BestiaryStore } from '../../core/bestiary-store';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

@Component({
  selector: 'app-monster-picker',
  standalone: true,
  templateUrl: './monster-picker.html',
})
export class MonsterPicker {
  protected bestiaryStore = inject(BestiaryStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  @Input() campaignId!: string;
  @Output() closed = new EventEmitter<void>();

  isSelected(monster: BestiaryMonster): boolean {
    return this.bestiaryStore.selectedIds().has(monster.id);
  }

  async toggle(monster: BestiaryMonster) {
    // Il limite vero è imposto lato RLS (get_campaign_addition_limit): questo controllo
    // evita solo un errore di permessi poco chiaro se la quota si è esaurita nel frattempo
    // (stesso guard di NpcForm.submit per i PNG).
    if (!this.isSelected(monster) && !this.bestiaryStore.canAddMonsterToCampaign()) {
      this.modal.error(this.localeService.t('bestiary_quota_reached_hint'));
      return;
    }

    const { error } = this.isSelected(monster)
      ? await this.bestiaryStore.removeFromCampaign(this.campaignId, monster.id)
      : await this.bestiaryStore.addToCampaign(this.campaignId, monster.id);

    if (error) {
      this.modal.error(error.message);
    }
  }

  close() {
    this.closed.emit();
  }
}
