import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { ContentStore, normalizeAbilityBonuses } from '../../core/content-store';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-subrace-list',
  standalone: true,
  templateUrl: './subrace-list.html',
})
export class SubraceList {
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  @Input() expanded = false;
  @Output() toggle = new EventEmitter<void>();

  races = this.contentStore.getContent('races');
  subraces = this.contentStore.getContent('subraces');

  private abilityKeys = ['str', 'dex', 'cos', 'int', 'wis', 'cha'] as const;

  // Nome della razza genitrice, per mostrarlo sotto la sottorazza.
  raceName(sub: any): string {
    const race = this.races().find((r: any) => r.id === sub.raw.race_id);
    return race?.name ?? '—';
  }

  bonusSummary(sub: any): string {
    const bonuses = normalizeAbilityBonuses(sub.raw.ability_bonuses);
    const parts = this.abilityKeys
      .filter((k) => bonuses[k] > 0)
      .map((k) => `+${bonuses[k]} ${this.localeService.t('ability_' + k)}`);
    if (sub.raw.free_bonus_points > 0) {
      parts.push(`+${sub.raw.free_bonus_points} ${this.localeService.t('free_bonus_summary_label')} (max +${sub.raw.free_bonus_max_per_ability})`);
    }
    return parts.join(', ');
  }
}
