import { Component, inject } from '@angular/core';
import { Card } from '../../shared/card/card';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterDiaryForm } from './character-diary-form';
import { CharacterDiarySwiper } from './character-diary-swiper';

// Tab Taccuino: form di scrittura a sinistra, carosello delle pagine già scritte a destra.
@Component({
  selector: 'app-character-diary-tab',
  imports: [Card, CharacterDiaryForm, CharacterDiarySwiper],
  template: `
    <app-card contentClass="grid grid-cols-1 lg:grid-cols-2 gap-6">
      @if (!context.readOnly()) {
        <app-character-diary-form />
      }
      <app-character-diary-swiper />
    </app-card>
  `,
})
export class CharacterDiaryTab {
  protected context = inject(CharacterSheetContext);
}
