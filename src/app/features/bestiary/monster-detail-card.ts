import { Component, inject, input, output } from '@angular/core';
import { BestiaryMonster } from '../../core/bestiary-store';
import { LocaleService } from '../../core/locale';
import { MonsterTraitList } from './monster-trait-list';

// Scheda dettagli del mostro in cima al mazzo (estratta da Bestiary, che con questo blocco
// dentro sforava il limite di 100 righe di template): solo presentazione, l'azione
// "Piazza sulla Mappa" è delegata al genitore via output, che ha accesso a CampaignTokens.
@Component({
  selector: 'app-monster-detail-card',
  standalone: true,
  imports: [MonsterTraitList],
  templateUrl: './monster-detail-card.html',
})
export class MonsterDetailCard {
  protected localeService = inject(LocaleService);

  readonly monster = input.required<BestiaryMonster>();
  readonly canPlaceOnMap = input(false);
  readonly canManage = input(false);

  readonly placeOnMap = output<void>();
  readonly remove = output<void>();

  // Formula standard D&D 5e: modificatore = floor((punteggio - 10) / 2). Non salvato su
  // DB, calcolato al volo qui come già avviene in character-sheet/character-create.
  protected abilityModifier(score: number | null): string {
    if (score === null) return '—';
    const modifier = Math.floor((score - 10) / 2);
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }

  // Colore del modificatore in evidenza nella mattonella caratteristica: verde per un
  // bonus, oro per neutro/negativo (qui non serve il rosso "malus" della scheda
  // personaggio, è un dato statico da consultare, non uno stato del giocatore).
  protected abilityModifierClass(score: number | null): string {
    if (score === null) return 'text-forge-text-sub';
    const modifier = Math.floor((score - 10) / 2);
    return modifier > 0 ? 'text-emerald-400' : 'text-forge-gold-glow';
  }
}
