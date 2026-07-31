import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { ContentStore } from '../../core/content-store';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-class-list',
  standalone: true,
  templateUrl: './class-list.html',
})
export class ClassList {
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  @Input() expanded = false;
  @Output() toggle = new EventEmitter<void>();

  classes = this.contentStore.getContent('classes');
}
