import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CharacterSheet } from '../character-sheet/character-sheet';
import { AppNav } from '../../core/app-nav';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-character-sheet-page',
  standalone: true,
  imports: [CharacterSheet],
  templateUrl: './character-sheet-page.html',
})
export class CharacterSheetPage {
  private route = inject(ActivatedRoute);
  protected appNav = inject(AppNav);
  protected localeService = inject(LocaleService);

  characterId = this.route.snapshot.paramMap.get('id')!;

  goBackToHub() {
    this.appNav.setTab('hub');
  }
}
