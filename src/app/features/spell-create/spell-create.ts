import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

interface HomebrewSpell {
  id: string;
  name: string;
  level: number;
  casting_time: string | null;
  range: string | null;
  duration: string | null;
  damage_effect: string | null;
  classes: { name: string }[] | null;
  description: string | null;
}

@Component({
  selector: 'app-spell-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './spell-create.html',
})
export class SpellCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected classesCatalog = this.contentStore.getContent('classes');
  protected homebrewSpells = signal<HomebrewSpell[]>([]);

  levels = Array.from({ length: 10 }, (_, i) => i);

  level = 0;
  name = '';
  castingTime = '';
  range = '';
  duration = '';
  damageEffect = '';
  description = '';
  selectedClassIds = new Set<string>();

  editingId: string | null = null;

  loading = signal(false);

  constructor() {
    this.loadHomebrewSpells();
  }

  toggleClass(id: string) {
    const current = new Set(this.selectedClassIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedClassIds = current;
  }

  isClassSelected(id: string): boolean {
    return this.selectedClassIds.has(id);
  }

  classNames(spell: HomebrewSpell): string {
    return (spell.classes ?? []).map((c) => c.name).join(', ');
  }

  private async loadHomebrewSpells() {
    const { data } = await this.supabase.client
      .from('spells')
      .select('id, name, level, casting_time, range, duration, damage_effect, classes, description')
      .eq('sourcebook_code', 'homebrew')
      .order('name');
    this.homebrewSpells.set(data ?? []);
  }

  private resetForm() {
    this.editingId = null;
    this.name = '';
    this.level = 0;
    this.castingTime = '';
    this.range = '';
    this.duration = '';
    this.damageEffect = '';
    this.description = '';
    this.selectedClassIds = new Set();
  }

  startEdit(spell: HomebrewSpell) {
    this.editingId = spell.id;
    this.name = spell.name;
    this.level = spell.level;
    this.castingTime = spell.casting_time ?? '';
    this.range = spell.range ?? '';
    this.duration = spell.duration ?? '';
    this.damageEffect = spell.damage_effect ?? '';
    this.description = spell.description ?? '';
    const classNames = new Set((spell.classes ?? []).map((c) => c.name));
    const matchingIds = this.classesCatalog()
      .filter((c: any) => classNames.has(c.raw.name))
      .map((c: any) => c.id);
    this.selectedClassIds = new Set(matchingIds);
  }

  cancelEdit() {
    this.resetForm();
  }

  async submit() {
    this.loading.set(true);

    const chosenClasses = this.classesCatalog()
      .filter((c: any) => this.selectedClassIds.has(c.id))
      .map((c: any) => ({ name: c.raw.name }));

    const payload = {
      name: this.name,
      level: this.level,
      sourcebook_code: 'homebrew',
      classes: chosenClasses,
      casting_time: this.castingTime || null,
      range: this.range || null,
      duration: this.duration || null,
      damage_effect: this.damageEffect || null,
      description: this.description || null,
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('spells').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('spells').insert(payload);

    if (error) {
      this.modal.error(error.message);
    } else {
      this.resetForm();
      this.contentStore.invalidate('spells');
      await this.loadHomebrewSpells();
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  async deleteSpell(id: string, name: string) {
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_delete_spell')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('spells').delete().eq('id', id);
    if (error) {
      this.modal.error(error.message);
    } else {
      this.contentStore.invalidate('spells');
      await this.loadHomebrewSpells();
    }
  }
}
