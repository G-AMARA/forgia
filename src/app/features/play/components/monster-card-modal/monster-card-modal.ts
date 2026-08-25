import { Component, HostListener, inject, input, output } from '@angular/core';
import { CampaignToken } from '../../../../core/campaign-tokens';
import { LocaleService } from '../../../../core/locale';

// "Carta del Mostro": click destro su un token mostro/NPC in InteractiveBoardComponent
// (vedi token-context-menu.ts). Puramente visiva — solo l'immagine del token in grande e
// il nome, niente statblock: il token porta già tutto ciò che serve (name/avatarUrl), non
// c'è bisogno di risalire al catalogo bestiario.
@Component({
  selector: 'app-monster-card-modal',
  standalone: true,
  templateUrl: './monster-card-modal.html',
})
export class MonsterCardModalComponent {
  protected localeService = inject(LocaleService);

  readonly token = input.required<CampaignToken>();

  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape() {
    this.closed.emit();
  }
}
