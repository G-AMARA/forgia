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

  traitsSummary(race: any): string {
    const traits = race.raw.traits;
    if (!traits || traits.length === 0) return '';
    return traits
      .slice(0, 2)
      .map((t: any) => t.name)
      .join(' · ');
  }
}
