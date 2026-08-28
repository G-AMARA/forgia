import { Component, inject, signal } from '@angular/core';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { groupByRank, RankGroup } from '../../core/ranks';

// Solo il pannello modale: sola lettura, dati caricati al momento dell'apertura per non
// pesare sul caricamento dell'app. Il trigger vive nella tab-bar di App (accanto a
// "Catalogo contenuti"), che apre questo pannello via viewChild + open().
@Component({
  selector: 'app-adventurers',
  standalone: true,
  templateUrl: './adventurers.html',
})
export class Adventurers {
  private auth = inject(Auth);
  protected localeService = inject(LocaleService);

  protected isOpen = signal(false);
  protected loading = signal(false);
  protected groups = signal<RankGroup[]>([]);

  async open() {
    this.isOpen.set(true);
    this.loading.set(true);
    const { data } = await this.auth.listAdventurers();
    this.groups.set(groupByRank(data));
    this.loading.set(false);
  }

  protected close() {
    this.isOpen.set(false);
  }
}
