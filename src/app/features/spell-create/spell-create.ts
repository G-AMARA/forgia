import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';

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

  errorMsg = signal<string | null>(null);
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

  async submit() {
    this.errorMsg.set(null);
    this.loading.set(true);

    const chosenClasses = this.classesCatalog()
      .filter((c: any) => this.selectedClassIds.has(c.id))
      .map((c: any) => ({ name: c.raw.name }));

    const { error } = await this.supabase.client.from('spells').insert({
      name: this.name,
      level: this.level,
      sourcebook_code: 'homebrew',
      classes: chosenClasses,
      casting_time: this.castingTime || null,
      range: this.range || null,
      duration: this.duration || null,
      damage_effect: this.damageEffect || null,
      description: this.description || null,
    });

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.name = '';
      this.level = 0;
      this.castingTime = '';
      this.range = '';
      this.duration = '';
      this.damageEffect = '';
      this.description = '';
      this.selectedClassIds = new Set();
      this.contentStore.invalidate('spells');
      await this.loadHomebrewSpells();
    }

    this.loading.set(false);
  }

  async deleteSpell(id: string, name: string) {
    const confirmed = window.confirm(`${this.localeService.t('confirm_delete_spell')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('spells').delete().eq('id', id);
    if (!error) {
      this.contentStore.invalidate('spells');
      await this.loadHomebrewSpells();
    }
  }
}
