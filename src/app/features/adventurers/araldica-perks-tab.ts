import { Component, inject } from '@angular/core';
import { LocaleService } from '../../core/locale';

// Sotto-componente del pannello Avventurieri: descrive a testo libero le funzionalità
// legate al rango araldico, per lato giocatore/DM. Testo invece di una tabella per-rango
// perché l'elenco cresce nel tempo (nuove card sbloccabili, nuovi limiti, ecc.): estendere
// vuol dire aggiungere una frase alla traduzione, non una nuova riga strutturata.
@Component({
  selector: 'app-araldica-perks-tab',
  standalone: true,
  templateUrl: './araldica-perks-tab.html',
})
export class AraldicaPerksTab {
  protected localeService = inject(LocaleService);
}
