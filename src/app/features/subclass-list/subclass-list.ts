import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { ContentStore } from '../../core/content-store';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-subclass-list',
  standalone: true,
  templateUrl: './subclass-list.html',
})
export class SubclassList {
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  @Input() expanded = false;
  @Output() toggle = new EventEmitter<void>();

  classes = this.contentStore.getContent('classes');
  subclasses = this.contentStore.getContent('subclasses');

  // Nome della classe genitrice, per mostrarlo sotto la sottoclasse.
  className(sub: any): string {
    const cls = this.classes().find((c: any) => c.id === sub.raw.class_id);
    return cls?.name ?? '—';
  }
}
