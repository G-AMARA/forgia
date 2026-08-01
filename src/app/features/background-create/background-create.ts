import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';

const SKILL_KEYS = [
  'acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history',
  'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
  'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival',
];

@Component({
  selector: 'app-background-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './background-create.html',
})
export class BackgroundCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  protected backgrounds = this.contentStore.getContent('backgrounds');

  skillKeys = SKILL_KEYS;

  name = '';
  description = '';
  selectedSkills = new Set<string>();

  editingId: string | null = null;

  errorMsg = signal<string | null>(null);
  loading = signal(false);

  toggleSkill(key: string) {
    const current = new Set(this.selectedSkills);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.selectedSkills = current;
  }

  isSkillSelected(key: string): boolean {
    return this.selectedSkills.has(key);
  }

  private async refreshBackgrounds() {
    await this.contentStore.refresh('backgrounds');
  }

  private resetForm() {
    this.editingId = null;
    this.name = '';
    this.description = '';
    this.selectedSkills = new Set();
  }

  // Le competenze arrivano come stringhe piatte (homebrew), oggetti SRD con index
  // tipo "skill-insight", o oggetti homebrew più vecchi con solo il nome inglese.
  private toSkillKey(p: any): string {
    if (typeof p === 'string') return p;
    if (p.index) return p.index.replace(/^skill-/, '');
    return (p.name ?? '').toLowerCase().replace(/\s+/g, '_');
  }

  startEdit(background: any) {
    this.editingId = background.id;
    this.name = background.raw.name;
    this.description = background.raw.description ?? '';
    const proficiencies = (background.raw.skill_proficiencies ?? []).map((p: any) => this.toSkillKey(p));
    this.selectedSkills = new Set(proficiencies);
  }

  cancelEdit() {
    this.resetForm();
  }

  async submit() {
    this.errorMsg.set(null);
    this.loading.set(true);

    const payload = {
      name: this.name,
      description: this.description || null,
      skill_proficiencies: Array.from(this.selectedSkills),
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('backgrounds').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('backgrounds').insert(payload);

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.resetForm();
      await this.refreshBackgrounds();
    }

    this.loading.set(false);
  }

  skillNames(background: any): string {
    const proficiencies = background.raw.skill_proficiencies;
    if (!proficiencies || proficiencies.length === 0) return '—';
    return proficiencies
      .map((p: any) => (typeof p === 'string' ? this.localeService.t('skill_' + p) : p.name))
      .join(', ');
  }

  async deleteBackground(id: string, name: string) {
    const confirmed = window.confirm(`${this.localeService.t('confirm_delete_background')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('backgrounds').delete().eq('id', id);
    if (!error) {
      await this.refreshBackgrounds();
    }
  }
}
