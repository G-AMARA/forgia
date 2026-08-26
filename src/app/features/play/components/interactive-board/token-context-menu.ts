import { Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CampaignToken, CampaignTokens } from '../../../../core/campaign-tokens';
import { LocaleService } from '../../../../core/locale';

export interface ScreenPoint {
  x: number;
  y: number;
}

const MOBILE_BREAKPOINT_PX = 768;
// Margine minimo dai bordi (oltre al clamp superiore richiesto): un valore troppo vicino
// a 0 lascerebbe comunque il menu incollato al bordo se il tap è vicino all'origine.
const EDGE_MARGIN_PX = 8;
const ASSUMED_MENU_SIZE_PX = 200;

// Popover contestuale (click destro/long-press su una pedina, vedi InteractiveBoardComponent).
// Vive fuori dal wrapper .board trasformato: è ancorato in coordinate schermo
// (position:fixed), non deve scalare/traslare con pan/zoom della mappa. Su mobile diventa
// un bottom sheet fisso (posizione assoluta ancorata al tap sarebbe spesso fuori schermo su
// schermi piccoli), su desktop resta un popover con le coordinate agganciate ma clampate
// dentro la viewport.
@Component({
  selector: 'app-token-context-menu',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './token-context-menu.html',
})
export class TokenContextMenuComponent {
  private campaignTokens = inject(CampaignTokens);
  protected localeService = inject(LocaleService);

  readonly token = input.required<CampaignToken>();
  readonly isMaster = input(false);
  readonly canRemove = input(false);
  readonly position = input.required<ScreenPoint>();

  // Deciso una volta sola all'apertura (nuova istanza a ogni menu, vedi @if nel padre):
  // non serve reagire a un resize della finestra mentre il menu è aperto.
  protected readonly isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;

  protected desktopPosition = computed(() => {
    const pos = this.position();
    const maxLeft = window.innerWidth - ASSUMED_MENU_SIZE_PX;
    const maxTop = window.innerHeight - ASSUMED_MENU_SIZE_PX;
    return {
      left: Math.max(EDGE_MARGIN_PX, Math.min(pos.x, maxLeft)),
      top: Math.max(EDGE_MARGIN_PX, Math.min(pos.y, maxTop)),
    };
  });

  // Il padre (InteractiveBoardComponent) la ribalta a Play, che la broadcasta agli altri
  // client: la mutazione locale è già applicata in ottimistico dal servizio.
  readonly mutated = output<void>();
  readonly closed = output<void>();
  // Nessuna mutazione DB, quindi non passa da mutated: il padre apre semplicemente la
  // "Carta del Mostro" in locale (vedi InteractiveBoardComponent.onInspectToken).
  readonly inspectToken = output<CampaignToken>();

  protected inspect() {
    this.inspectToken.emit(this.token());
    this.closed.emit();
  }

  protected async remove() {
    const removed = await this.campaignTokens.remove(this.token().id);
    if (!removed) return;
    this.afterAction();
  }

  protected async toggleLock() {
    await this.campaignTokens.setLocked(this.token().id, !this.token().isLocked);
    this.afterAction();
  }

  protected async toggleVisible() {
    await this.campaignTokens.setVisible(this.token().id, !this.token().isVisible);
    this.afterAction();
  }

  private afterAction() {
    this.mutated.emit();
    this.closed.emit();
  }
}
