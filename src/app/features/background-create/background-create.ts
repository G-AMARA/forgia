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
  selectedSkills = new Set<string>();

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

  private refreshBackgrounds() {
    this.contentStore.invalidate('backgrounds');
    this.backgrounds = this.contentStore.getContent('backgrounds');
  }

  async submit() {
    this.errorMsg.set(null);
    this.loading.set(true);

    const { error } = await this.supabase.client.from('backgrounds').insert({
      name: this.name,
      skill_proficiencies: Array.from(this.selectedSkills),
    });

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.name = '';
      this.selectedSkills = new Set();
      this.refreshBackgrounds();
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
      this.refreshBackgrounds();
    }
  }
}
