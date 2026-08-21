import { Component, inject, input, output } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { SubTab } from './character-sheet.types';

// Bottoni di navigazione fra le 6 sotto-schede.
@Component({
  selector: 'app-character-sheet-tabs',
  imports: [],
  // display:contents: senza, l'host del componente aggiunge un box block-level in più
  // dentro alla riga flex (items-center) di CharacterSheet, che non esisteva nel markup
  // originale (era un <div> diretto) — bastava a disallineare verticalmente i tab rispetto
  // al bottone Salva accanto.
  host: { class: 'contents' },
  templateUrl: './character-sheet-tabs.html',
})
export class CharacterSheetTabs {
  protected localeService = inject(LocaleService);

  readonly active = input.required<SubTab>();
  readonly hasSpells = input(false);

  readonly tabChange = output<SubTab>();
}
