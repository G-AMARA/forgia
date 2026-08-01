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

  abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  name = '';
  hitDie = 8;
  savingThrows = new Set<string>();

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

  private refreshClasses() {
    this.contentStore.invalidate('classes');
    this.classes = this.contentStore.getContent('classes');
  }

  async submit() {
    this.errorMsg.set(null);
    this.loading.set(true);

    const { error } = await this.supabase.client.from('classes').insert({
      name: this.name,
      hit_die: this.hitDie,
      saving_throw_proficiencies: Array.from(this.savingThrows),
    });

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.name = '';
      this.hitDie = 8;
      this.savingThrows = new Set();
      this.refreshClasses();
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
      this.refreshClasses();
    }
  }
}
