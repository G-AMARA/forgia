import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { ContentStore } from '../../core/content-store';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-background-list',
  standalone: true,
  templateUrl: './background-list.html',
})
export class BackgroundList {
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  @Input() expanded = false;
  @Output() toggle = new EventEmitter<void>();

  backgrounds = this.contentStore.getContent('backgrounds');

  skillNames(background: any): string {
    const proficiencies = background.raw.skill_proficiencies;
    if (!proficiencies) return '—';
    return proficiencies.map((p: any) => p.name).join(', ');
  }

  featureDescription(background: any): string | null {
    return background.raw.raw_srd?.feature?.description ?? null;
  }
}
