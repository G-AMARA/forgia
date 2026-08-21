import { Component, inject, input } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { CharacterWeaponsService } from './character-weapons';

// Righe di dettaglio (attacco/danno/gittata/peso/quantità/costo/proprietà) di un'arma
// selezionata: contenuto condiviso tra la vista desktop ("libro") e quella mobile (card),
// che differiscono solo nel contenitore attorno (vedi CharacterWeaponsTab) e nel colore
// del testo (variant).
@Component({
  selector: 'app-character-weapon-detail',
  imports: [],
  templateUrl: './character-weapon-detail.html',
})
export class CharacterWeaponDetail {
  protected weapons = inject(CharacterWeaponsService);
  protected localeService = inject(LocaleService);

  readonly variant = input<'book' | 'mobile'>('book');
  protected valueClass = () => (this.variant() === 'mobile' ? 'font-body text-sm text-gold-bright' : 'font-body text-sm');
  protected labelClass = () =>
    this.variant() === 'mobile'
      ? 'block text-[0.6rem] uppercase tracking-wider font-bold text-fantasy-gold/60'
      : 'block text-[0.6rem] uppercase tracking-wider font-bold opacity-70';
}
