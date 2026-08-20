import { Component, OnInit, inject, signal } from '@angular/core';
import { BestiaryMonster, BestiaryStore } from '../../../core/bestiary-store';
import { LocaleService } from '../../../core/locale';
import { Modal } from '../../../core/modal';
import { MonsterForm } from './monster-form';

@Component({
  selector: 'app-bestiary-manage',
  standalone: true,
  imports: [MonsterForm],
  templateUrl: './bestiary-manage.html',
})
export class BestiaryManage implements OnInit {
  protected bestiaryStore = inject(BestiaryStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected formOpen = signal(false);
  protected editingMonster = signal<BestiaryMonster | null>(null);

  ngOnInit() {
    this.bestiaryStore.loadCatalog();
  }

  openAddForm() {
    this.editingMonster.set(null);
    this.formOpen.set(true);
  }

  openEditForm(monster: BestiaryMonster) {
    this.editingMonster.set(monster);
    this.formOpen.set(true);
  }

  onFormClosed() {
    this.formOpen.set(false);
    this.editingMonster.set(null);
  }

  async deleteMonster(monster: BestiaryMonster) {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('bestiary_confirm_delete_monster')} "${monster.name}"?`
    );
    if (!confirmed) return;

    const { error } = await this.bestiaryStore.deleteMonster(monster.id);
    if (error) {
      this.modal.error(error.message);
    }
  }
}
