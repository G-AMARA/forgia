import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore, normalizeAbilityBonuses } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { TraitBlock } from '../../core/bestiary-store';
import { TraitListEditor } from '../manage/bestiary-manage/trait-list-editor';
import { SKILLS } from '../../core/skills';

@Component({
  selector: 'app-race-create',
  standalone: true,
  imports: [FormsModule, TraitListEditor],
  templateUrl: './race-create.html',
})
export class RaceCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected races = this.contentStore.getContent('races');

  skillKeys = SKILLS.map((s) => s.key);

  name = '';
  speed = 9;
  description = '';
  darkvision = false;
  abilityBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
  abilityKeys: (keyof typeof this.abilityBonuses)[] = ['str', 'dex', 'cos', 'int', 'wis', 'cha'];
  freeBonusPoints = 0;
  freeBonusMaxPerAbility = 0;
  traits: TraitBlock[] = [];
  // Competenze automatiche della razza (es. Percezione per l'Harengon): in scheda personaggio
  // risultano spuntate e bloccate finché si ha questa razza.
  selectedSkills = new Set<string>();

  editingId: string | null = null;

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

  private async refreshRaces() {
    await this.contentStore.refresh('races');
  }

  private resetForm() {
    this.editingId = null;
    this.name = '';
    this.speed = 9;
    this.description = '';
    this.darkvision = false;
    this.abilityBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
    this.freeBonusPoints = 0;
    this.freeBonusMaxPerAbility = 0;
    this.traits = [];
    this.selectedSkills = new Set();
  }

  startEdit(race: any) {
    this.editingId = race.id;
    this.name = race.raw.name;
    this.speed = race.raw.speed ?? 9;
    this.description = race.raw.description ?? '';
    this.darkvision = race.raw.darkvision ?? false;
    this.abilityBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0, ...normalizeAbilityBonuses(race.raw.ability_bonuses) };
    this.freeBonusPoints = race.raw.free_bonus_points ?? 0;
    this.freeBonusMaxPerAbility = race.raw.free_bonus_max_per_ability ?? 0;
    this.traits = structuredClone(race.raw.traits ?? []);
    this.selectedSkills = new Set(race.raw.skill_proficiencies ?? []);
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
      darkvision: this.darkvision,
      ability_bonuses: this.abilityBonuses,
      free_bonus_points: this.freeBonusPoints,
      free_bonus_max_per_ability: this.freeBonusMaxPerAbility,
      traits: this.traits,
      skill_proficiencies: Array.from(this.selectedSkills),
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('races').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('races').insert(payload);

    if (error) {
      this.modal.error(error.message);
    } else {
      // Senza questo, una vecchia traduzione salvata (content_translations) continuerebbe
      // a "vincere" sul nome appena modificato qui, mostrando per sempre quello vecchio.
      if (this.editingId) {
        await this.contentStore.clearTranslation('races', this.editingId);
      }
      this.resetForm();
      await this.refreshRaces();
      !this.editingId 
      ? this.modal.success(this.localeService.t('well_saved_race')) 
      : this.modal.success(this.localeService.t('well_updated_race')) 
    }

    this.loading.set(false);
  }

  bonusSummary(race: any): string {
    const bonuses = normalizeAbilityBonuses(race.raw.ability_bonuses);
    const parts = this.abilityKeys
      .filter((k) => bonuses[k] > 0)
      .map((k) => `+${bonuses[k]} ${this.localeService.t('ability_' + k)}`);
    if (race.raw.free_bonus_points > 0) {
      parts.push(`+${race.raw.free_bonus_points} ${this.localeService.t('free_bonus_summary_label')} (max +${race.raw.free_bonus_max_per_ability})`);
    }
    return parts.join(', ') || '—';
  }

  async deleteRace(id: string, name: string) {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_race')} "${name}"?`,
      {
        cancelLabel: this.localeService.t('cancel_button'),
        confirmLabel: this.localeService.t('confirm_delete_race_title')
      }
    );
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('races').delete().eq('id', id);
    if (error) {
      this.modal.error(error.message);
    } else {
      let confirmed = await this.modal.success(
        `${this.localeService.t('race_deleted_msg_1')} "${name}" ${this.localeService.t('race_deleted_msg_2')}`
      );
      if(!confirmed) return;
      await this.refreshRaces();
    }
  }
}
