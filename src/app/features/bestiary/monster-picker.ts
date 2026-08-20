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
