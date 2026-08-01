import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore, normalizeAbilityBonuses } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';

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

  protected races = this.contentStore.getContent('races');

  name = '';
  speed = 9;
  abilityBonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  abilityKeys: (keyof typeof this.abilityBonuses)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  errorMsg = signal<string | null>(null);
  loading = signal(false);

  private refreshRaces() {
    this.contentStore.invalidate('races');
    this.races = this.contentStore.getContent('races');
  }

  async submit() {
    this.errorMsg.set(null);
    this.loading.set(true);

    const { error } = await this.supabase.client.from('races').insert({
      name: this.name,
      speed: this.speed,
      ability_bonuses: this.abilityBonuses,
    });

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.name = '';
      this.speed = 9;
      this.abilityBonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
      this.refreshRaces();
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
    const confirmed = window.confirm(`${this.localeService.t('confirm_delete_race')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('races').delete().eq('id', id);
    if (!error) {
      this.refreshRaces();
    }
  }
}
