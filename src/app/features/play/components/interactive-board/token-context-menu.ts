import { Component, inject, input, output } from '@angular/core';
import { CampaignToken, CampaignTokens } from '../../../../core/campaign-tokens';
import { LocaleService } from '../../../../core/locale';

export interface ScreenPoint {
  x: number;
  y: number;
}

// Popover contestuale (click destro su una pedina, vedi InteractiveBoardComponent). Vive
// fuori dal wrapper .board trasformato: è ancorato in coordinate schermo (position:fixed),
// non deve scalare/traslare con pan/zoom della mappa.
@Component({
  selector: 'app-token-context-menu',
  standalone: true,
  templateUrl: './token-context-menu.html',
})
export class TokenContextMenuComponent {
  private campaignTokens = inject(CampaignTokens);
  protected localeService = inject(LocaleService);

  readonly token = input.required<CampaignToken>();
  readonly isMaster = input(false);
  readonly canRemove = input(false);
  readonly position = input.required<ScreenPoint>();

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
