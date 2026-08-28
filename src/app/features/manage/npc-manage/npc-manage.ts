import { Component, OnInit, inject, signal } from '@angular/core';
import { NpcCharacter, NpcStore } from '../../../core/npc-store';
import { LocaleService } from '../../../core/locale';
import { Modal } from '../../../core/modal';
import { NpcForm } from './npc-form';

@Component({
  selector: 'app-npc-manage',
  standalone: true,
  imports: [NpcForm],
  templateUrl: './npc-manage.html',
})
export class NpcManage implements OnInit {
  protected npcStore = inject(NpcStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected formOpen = signal(false);
  protected editingNpc = signal<NpcCharacter | null>(null);

  ngOnInit() {
    this.npcStore.loadCatalog();
  }

  openAddForm() {
    this.editingNpc.set(null);
    this.formOpen.set(true);
  }

  openEditForm(npc: NpcCharacter) {
    this.editingNpc.set(npc);
    this.formOpen.set(true);
  }

  onFormClosed() {
    this.formOpen.set(false);
    this.editingNpc.set(null);
  }

  async deleteNpc(npc: NpcCharacter) {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('npc_confirm_delete')} "${npc.name}"?`
    );
    if (!confirmed) return;

    const { error } = await this.npcStore.deleteNpc(npc.id);
    if (error) {
      this.modal.error(error.message);
    }
  }
}
