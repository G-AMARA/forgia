import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NpcCharacter, NpcStore } from '../../core/npc-store';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

@Component({
  selector: 'app-npc-picker',
  standalone: true,
  templateUrl: './npc-picker.html',
})
export class NpcPicker {
  protected npcStore = inject(NpcStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  @Input() campaignId!: string;
  @Output() closed = new EventEmitter<void>();

  isSelected(npc: NpcCharacter): boolean {
    return this.npcStore.selectedIds().has(npc.id);
  }

  async toggle(npc: NpcCharacter) {
    // Il limite vero è imposto lato RLS (get_campaign_addition_limit su
    // campaign_npc_characters): questo controllo evita solo un errore di permessi poco
    // chiaro se la quota si è esaurita nel frattempo (stesso guard di MonsterPicker.toggle).
    if (!this.isSelected(npc) && !this.npcStore.canAddNpcToCampaign()) {
      this.modal.error(this.localeService.t('npc_quota_reached_hint'));
      return;
    }

    const { error } = this.isSelected(npc)
      ? await this.npcStore.removeFromCampaign(this.campaignId, npc.id)
      : await this.npcStore.addToCampaign(this.campaignId, npc.id);

    if (error) {
      this.modal.error(error.message);
    }
  }

  close() {
    this.closed.emit();
  }
}
