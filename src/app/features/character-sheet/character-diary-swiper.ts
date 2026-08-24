import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterDiaryService } from './character-diary';

// Stesso pattern lazy di bestiary.ts: import dinamico (genera il chunk separato
// "swiper-element-bundle" invece di gonfiare il bundle iniziale) + flag anti-doppia-
// registrazione (customElements.define lancia se richiamato due volte sullo stesso tag).
let swiperRegistered: Promise<void> | null = null;
function ensureSwiperRegistered(): Promise<void> {
  if (!swiperRegistered) {
    swiperRegistered = import('swiper/element/bundle').then(({ register }) => register());
  }
  return swiperRegistered;
}

// Carosello Swiper delle pagine di diario già scritte, una alla volta con frecce per
// sfogliarle. Isola qui la registrazione di swiper-element e lo schema CUSTOM_ELEMENTS
// (richiesto da <swiper-container>/<swiper-slide>), invece di tenerli sul componente radice.
@Component({
  selector: 'app-character-diary-swiper',
  imports: [],
  templateUrl: './character-diary-swiper.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CharacterDiarySwiper implements OnInit {
  protected context = inject(CharacterSheetContext);
  protected diary = inject(CharacterDiaryService);
  protected localeService = inject(LocaleService);

  ngOnInit() {
    ensureSwiperRegistered();
  }
}
