import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { EquipmentChoiceGroup } from '../../core/starting-equipment';
import { StartingEquipmentEditor } from '../starting-equipment-editor/starting-equipment-editor';

@Component({
  selector: 'app-class-create',
  standalone: true,
  imports: [FormsModule, StartingEquipmentEditor],
  templateUrl: './class-create.html',
})
export class ClassCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected classes = this.contentStore.getContent('classes');

  abilityKeys = ['str', 'dex', 'cos', 'int', 'wis', 'cha'];

  name = '';
  hitDie = 8;
  description = '';
  savingThrows = new Set<string>();
  // Difesa Senza Armatura: '' = nessuna, altrimenti chiave caratteristica (es. 'cos' per il
  // Barbaro) che si somma a Destrezza per la CA quando non si indossa armatura.
  unarmoredDefenseAbility = '';
  // Movimento Senza Armatura (Monaco): bonus di velocità per livello quando non si indossa
  // armatura né scudo, vedi core/unarmored-movement.ts.
  unarmoredMovement = false;
  startingEquipment = signal<EquipmentChoiceGroup[]>([]);

  editingId: string | null = null;

  loading = signal(false);

  toggleSavingThrow(key: string) {
    const current = new Set(this.savingThrows);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.savingThrows = current;
  }

  isSavingThrowSelected(key: string): boolean {
    return this.savingThrows.has(key);
  }

  private async refreshClasses() {
    await this.contentStore.refresh('classes');
  }

  private resetForm() {
    this.editingId = null;
    this.name = '';
    this.hitDie = 8;
    this.description = '';
    this.savingThrows = new Set();
    this.unarmoredDefenseAbility = '';
    this.unarmoredMovement = false;
    this.startingEquipment.set([]);
  }

  startEdit(cls: any) {
    this.editingId = cls.id;
    this.name = cls.raw.name;
    this.hitDie = cls.raw.hit_die ?? 8;
    this.description = cls.raw.description ?? '';
    const proficiencies = (cls.raw.saving_throw_proficiencies ?? []).map((p: any) =>
      typeof p === 'string' ? p : p.index ?? p.name
    );
    this.savingThrows = new Set(proficiencies);
    this.unarmoredDefenseAbility = cls.raw.unarmored_defense_ability ?? '';
    this.unarmoredMovement = cls.raw.unarmored_movement ?? false;
    this.startingEquipment.set(structuredClone(cls.raw.starting_equipment ?? []));
  }

  cancelEdit() {
    this.resetForm();
  }

  async submit() {
    this.loading.set(true);

    const payload = {
      name: this.name,
      hit_die: this.hitDie,
      description: this.description || null,
      saving_throw_proficiencies: Array.from(this.savingThrows),
      unarmored_defense_ability: this.unarmoredDefenseAbility || null,
      unarmored_movement: this.unarmoredMovement,
      starting_equipment: this.startingEquipment(),
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('classes').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('classes').insert(payload);

    if (error) {
      this.modal.error(error.message);
    } else {
      // Senza questo, una vecchia traduzione salvata (content_translations) continuerebbe
      // a "vincere" sul nome appena modificato qui, mostrando per sempre quello vecchio.
      if (this.editingId) {
        await this.contentStore.clearTranslation('classes', this.editingId);
      }
      this.resetForm();
      await this.refreshClasses();
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  savingThrowNames(cls: any): string {
    const proficiencies = cls.raw.saving_throw_proficiencies;
    if (!proficiencies || proficiencies.length === 0) return '—';
    return proficiencies
      .map((p: any) => (typeof p === 'string' ? this.localeService.t('ability_' + p) : p.name))
      .join(', ');
  }

  async deleteClass(id: string, name: string) {
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_delete_class')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('classes').delete().eq('id', id);
    if (error) {
      this.modal.error(error.message);
    } else {
      await this.refreshClasses();
    }
  }
}
