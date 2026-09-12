import { Component, inject, input, output } from '@angular/core';
import { NpcAttitude, NpcCharacter } from '../../core/npc-store';
import { LocaleService } from '../../core/locale';

// Scheda dettagli del PNG in cima al mazzo (estratta da Npc, stesso schema di
// MonsterDetailCard): solo presentazione, "Piazza sulla Mappa" è delegato al genitore
// via output, che ha accesso a CampaignTokens.
@Component({
  selector: 'app-npc-detail-card',
  standalone: true,
  templateUrl: './npc-detail-card.html',
})
export class NpcDetailCard {
  protected localeService = inject(LocaleService);

  readonly npc = input.required<NpcCharacter>();
  readonly canPlaceOnMap = input(false);
  readonly canManage = input(false);

  readonly placeOnMap = output<void>();
  readonly remove = output<void>();

  // Colore del valore in evidenza nella tessera .compendium-stat-tile (la tessera stessa
  // fa già da badge, qui serve solo il colore del testo).
  protected attitudeTextClass(attitude: NpcAttitude | null): string {
    if (attitude === 'friendly') return 'text-forest';
    if (attitude === 'hostile') return 'text-red-400';
    return 'text-forge-gold-glow';
  }
}
