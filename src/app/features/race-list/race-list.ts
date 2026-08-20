import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { ContentStore } from '../../core/content-store';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-race-list',
  standalone: true,
  templateUrl: './race-list.html',
})
export class RaceList {
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  @Input() expanded = false;
  @Output() toggle = new EventEmitter<void>();

  races = this.contentStore.getContent('races');

  freeBonusSummary(race: any): string {
    if (!(race.raw.free_bonus_points > 0)) return '';
    return `+${race.raw.free_bonus_points} ${this.localeService.t('free_bonus_summary_label')} (max +${race.raw.free_bonus_max_per_ability})`;
  }

  traitsSummary(race: any): string {
    const traits = race.raw.traits;
    if (!traits || traits.length === 0) return '';
    return traits
      .slice(0, 2)
      .map((t: any) => t.name)
      .join(' · ');
  }
}
