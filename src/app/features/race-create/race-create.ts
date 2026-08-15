import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore, normalizeAbilityBonuses } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

@Component({
  selector: 'app-race-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './race-create.html',
})
export class RaceCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected races = this.contentStore.getContent('races');

  name = '';
  speed = 9;
  description = '';
  abilityBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
  abilityKeys: (keyof typeof this.abilityBonuses)[] = ['str', 'dex', 'cos', 'int', 'wis', 'cha'];

  editingId: string | null = null;

  loading = signal(false);

  private async refreshRaces() {
    await this.contentStore.refresh('races');
  }

  private resetForm() {
    this.editingId = null;
    this.name = '';
    this.speed = 9;
    this.description = '';
    this.abilityBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
  }

  startEdit(race: any) {
    this.editingId = race.id;
    this.name = race.raw.name;
    this.speed = race.raw.speed ?? 9;
    this.description = race.raw.description ?? '';
    this.abilityBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0, ...normalizeAbilityBonuses(race.raw.ability_bonuses) };
  }

  cancelEdit() {
    this.resetForm();
  }

  async submit() {
    this.loading.set(true);

    const payload = {
      name: this.name,
      speed: this.speed,
      description: this.description || null,
      ability_bonuses: this.abilityBonuses,
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('races').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('races').insert(payload);

    if (error) {
      this.modal.error(error.message);
    } else {
      this.resetForm();
      await this.refreshRaces();
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  bonusSummary(race: any): string {
    const bonuses = normalizeAbilityBonuses(race.raw.ability_bonuses);
    return this.abilityKeys
      .filter((k) => bonuses[k] > 0)
      .map((k) => `+${bonuses[k]} ${this.localeService.t('ability_' + k)}`)
      .join(', ') || '—';
  }

  async deleteRace(id: string, name: string) {
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_delete_race')} "${name}"?`,
                                                this.localeService.t('confirm_delete_button_confirm'),
                                                this.localeService.t('cancel_button'),
                                                this.localeService.t('confirm_delete_race_title'));
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('races').delete().eq('id', id);
    if (error) {
      this.modal.error(error.message);
    } else {
      await this.refreshRaces();
    }
  }
}
