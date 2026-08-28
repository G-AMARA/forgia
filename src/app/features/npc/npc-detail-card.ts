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

  readonly placeOnMap = output<void>();

  protected attitudeClass(attitude: NpcAttitude | null): string {
    if (attitude === 'friendly') return 'border-forest text-forest';
    if (attitude === 'hostile') return 'border-red-500 text-red-400';
    if (attitude === 'neutral') return 'border-fantasy-gold text-fantasy-gold';
    return '';
  }
}
