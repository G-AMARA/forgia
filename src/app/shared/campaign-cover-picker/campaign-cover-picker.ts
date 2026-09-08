import { Component, model } from '@angular/core';
import { CAMPAIGN_COVERS, getCoverImagePath } from '../../core/campaign-covers';

// Anteprima grande + griglia di miniature per la scelta della copertina campagna. Condiviso tra
// creazione (CampaignCreateForm) e modifica (CampaignEdit) campagna; coverKey è model() per il
// binding a due vie [(coverKey)] con il campo ngModel del genitore.
@Component({
  selector: 'app-campaign-cover-picker',
  standalone: true,
  templateUrl: './campaign-cover-picker.html',
})
export class CampaignCoverPicker {
  coverKey = model.required<string>();

  readonly covers = CAMPAIGN_COVERS;
  protected getCoverImagePath = getCoverImagePath;

  protected selectedCover() {
    return this.covers.find((c) => c.key === this.coverKey()) ?? this.covers[0];
  }

  protected select(key: string) {
    this.coverKey.set(key);
  }
}
