import { Component, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CampaignStatus } from '../../core/active-campaign';
import { AdminProfile } from '../../core/auth';
import { LocaleService } from '../../core/locale';

// Card "Impostazioni & Regole" (stato, sessione, giocatori, livello, GM, visibilità),
// condivisa tra creazione e modifica campagna. Ogni campo è un model() per il binding a due
// vie [(x)]="x" col genitore, anche quando il genitore usa un campo ngModel semplice invece
// di un signal (Angular espone comunque la coppia model/modelChange), stesso pattern di
// CampaignCoverPicker. Il selettore Game Master è opzionale: solo CampaignEditForm lo abilita
// (via showGmSelector), CampaignCreateForm non ha ancora un owner da riassegnare.
@Component({
  selector: 'app-campaign-settings-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './campaign-settings-panel.html',
})
export class CampaignSettingsPanel {
  protected localeService = inject(LocaleService);

  readonly statuses: CampaignStatus[] = ['active', 'paused', 'completed'];

  showGmSelector = input(false);
  gmOptions = input<AdminProfile[]>([]);

  status = model.required<CampaignStatus>();
  nextSessionAtLocal = model.required<string>();
  maxPlayers = model.required<number | null>();
  startingLevel = model.required<number>();
  isPublic = model.required<boolean>();
  ownerId = model<string>('');

  protected togglePublic() {
    this.isPublic.set(!this.isPublic());
  }
}
