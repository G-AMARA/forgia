import { Component, input, output } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { inject } from '@angular/core';

// Bottone "Salva" riusato accanto alla barra dei tab (Generale/Combattimento/Inventario):
// stessa posizione per non rubare altezza al contenuto sotto, vedi CharacterSheet.
@Component({
  selector: 'app-character-sheet-save-button',
  imports: [],
  // display:contents, stesso motivo di CharacterSheetTabs: quando visible() è false l'host
  // non deve restare come box vuoto dentro alla riga flex del genitore.
  host: { class: 'contents' },
  template: `
    @if (visible()) {
      <button
        (click)="save.emit()"
        class="shrink-0 flex items-center gap-1.5 px-4 py-1.5 mb-1 bg-fantasy-gold text-fantasy-black font-display text-sm rounded border border-gold hover:bg-fantasy-moonstone transition-colors"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" class="text-gold-dark" />
          <rect x="6.5" y="4.5" width="8" height="5" fill="currentColor" class="text-fantasy-gold" />
          <rect x="6" y="13" width="12" height="6.5" rx="0.5" fill="currentColor" class="text-fantasy-gold/50" />
        </svg>
        {{ localeService.t('save_button') }}
      </button>
    }
  `,
})
export class CharacterSheetSaveButton {
  protected localeService = inject(LocaleService);

  readonly visible = input(false);
  readonly save = output<void>();
}
