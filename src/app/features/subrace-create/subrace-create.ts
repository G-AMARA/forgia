import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore, normalizeAbilityBonuses } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

@Component({
  selector: 'app-subrace-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './subrace-create.html',
})
export class SubraceCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected races = this.contentStore.getContent('races');
  protected subraces = this.contentStore.getContent('subraces');

  name = '';
  raceId = '';
  description = '';
  darkvision = false;
  abilityBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
  abilityKeys: (keyof typeof this.abilityBonuses)[] = ['str', 'dex', 'cos', 'int', 'wis', 'cha'];
  freeBonusPoints = 0;
  freeBonusMaxPerAbility = 0;

  editingId: string | null = null;

  loading = signal(false);

  private async refreshSubraces() {
    await this.contentStore.refresh('subraces');
  }

  private resetForm() {
    this.editingId = null;
    this.name = '';
    this.raceId = '';
    this.description = '';
    this.darkvision = false;
    this.abilityBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
    this.freeBonusPoints = 0;
    this.freeBonusMaxPerAbility = 0;
  }

  // Nome della razza genitrice, per mostrarlo nella lista del catalogo.
  raceName(sub: any): string {
    const race = this.races().find((r: any) => r.id === sub.raw.race_id);
    return race?.name ?? '—';
  }

  startEdit(sub: any) {
    this.editingId = sub.id;
    this.name = sub.raw.name;
    this.raceId = sub.raw.race_id;
    this.description = sub.description ?? '';
    this.darkvision = sub.raw.darkvision ?? false;
    this.abilityBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0, ...normalizeAbilityBonuses(sub.raw.ability_bonuses) };
    this.freeBonusPoints = sub.raw.free_bonus_points ?? 0;
    this.freeBonusMaxPerAbility = sub.raw.free_bonus_max_per_ability ?? 0;
  }

  cancelEdit() {
    this.resetForm();
  }

  async submit() {
    this.loading.set(true);

    const payload = {
      name: this.name,
      race_id: this.raceId,
      description: this.description || null,
      darkvision: this.darkvision,
      ability_bonuses: this.abilityBonuses,
      free_bonus_points: this.freeBonusPoints,
      free_bonus_max_per_ability: this.freeBonusMaxPerAbility,
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('subraces').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('subraces').insert(payload);

    if (error) {
      this.modal.error(error.message);
    } else {
      this.resetForm();
      await this.refreshSubraces();
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  bonusSummary(sub: any): string {
    const bonuses = normalizeAbilityBonuses(sub.raw.ability_bonuses);
    const parts = this.abilityKeys
      .filter((k) => bonuses[k] > 0)
      .map((k) => `+${bonuses[k]} ${this.localeService.t('ability_' + k)}`);
    if (sub.raw.free_bonus_points > 0) {
      parts.push(`+${sub.raw.free_bonus_points} ${this.localeService.t('free_bonus_summary_label')} (max +${sub.raw.free_bonus_max_per_ability})`);
    }
    return parts.join(', ') || '—';
  }

  async deleteSubrace(id: string, name: string) {
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_delete_subrace')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('subraces').delete().eq('id', id);
    if (error) {
      this.modal.error(error.message);
    } else {
      await this.refreshSubraces();
    }
  }
}
