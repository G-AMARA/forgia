import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-class-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './class-create.html',
})
export class ClassCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  protected classes = this.contentStore.getContent('classes');

  abilityKeys = ['str', 'dex', 'cos', 'int', 'wis', 'cha'];

  name = '';
  hitDie = 8;
  description = '';
  savingThrows = new Set<string>();

  editingId: string | null = null;

  errorMsg = signal<string | null>(null);
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
  }

  cancelEdit() {
    this.resetForm();
  }

  async submit() {
    this.errorMsg.set(null);
    this.loading.set(true);

    const payload = {
      name: this.name,
      hit_die: this.hitDie,
      description: this.description || null,
      saving_throw_proficiencies: Array.from(this.savingThrows),
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('classes').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('classes').insert(payload);

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.resetForm();
      await this.refreshClasses();
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
    const confirmed = window.confirm(`${this.localeService.t('confirm_delete_class')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('classes').delete().eq('id', id);
    if (!error) {
      await this.refreshClasses();
    }
  }
}
