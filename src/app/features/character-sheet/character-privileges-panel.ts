import { Component, inject, signal } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterPrivilegesService } from './character-privileges';

// Pannello "Privilegi e Tratti" a tab interne (Razziali / Sottoclasse / Background):
// estratto da CharacterTraitsPanel per essere riusabile anche nel pannello compatto della
// pagina "Gioca" (PlayCharacterPanel) senza trascinarsi dietro i riquadri caratteristica.
@Component({
  selector: 'app-character-privileges-panel',
  imports: [],
  templateUrl: './character-privileges-panel.html',
})
export class CharacterPrivilegesPanel {
  protected context = inject(CharacterSheetContext);
  protected privileges = inject(CharacterPrivilegesService);
  protected localeService = inject(LocaleService);

  protected privilegesTab = signal<'racial' | 'subclass' | 'background'>('racial');
}
