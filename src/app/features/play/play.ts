import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActiveCampaign } from '../../core/active-campaign';
import { Auth } from '../../core/auth';
import { AppNav } from '../../core/app-nav';
import { LocaleService } from '../../core/locale';
import { MapAlbumImage } from '../../core/map-albums';
import { PlayCharacterPanel } from './play-character-panel';
import { PlayMasterPanel } from './play-master-panel';
import { PlayMapPanel } from './play-map-panel';

// Base strutturale della pagina "Gioca" (rotta /gioca/:campaignId, stesso pattern di
// CharacterSheetPage): due colonne, contenuto della sinistra diverso per ruolo. Pedine,
// drag&drop e sincronizzazione realtime sono volutamente fuori scope, arrivano dopo.
@Component({
  selector: 'app-play',
  standalone: true,
  imports: [PlayCharacterPanel, PlayMasterPanel, PlayMapPanel],
  templateUrl: './play.html',
})
export class Play {
  private route = inject(ActivatedRoute);
  private activeCampaign = inject(ActiveCampaign);
  private auth = inject(Auth);
  protected appNav = inject(AppNav);
  protected localeService = inject(LocaleService);

  readonly campaignId = this.route.snapshot.paramMap.get('campaignId')!;

  // Ricalcolato qui invece di fidarsi di un booleano esterno: stessa logica di
  // CampaignHub.isOwner / Bestiary.canManage / Maps.canManage.
  protected isMaster = computed(() => {
    const campaign = this.activeCampaign.current();
    const userId = this.auth.user()?.id;
    return (!!campaign && !!userId && campaign.owner_id === userId) || this.auth.isAdmin();
  });

  // Stato locale, non persistito: la mappa scelta dal Master per la sessione si perde al
  // reload e per ora non è condivisa con i giocatori (nessuna sincronizzazione realtime,
  // volutamente fuori scope in questa base). Da rivedere insieme al futuro stato della
  // plancia/pedine, che probabilmente richiederà di persisterla.
  protected activeImage = signal<MapAlbumImage | null>(null);

  // A scomparsa: quando chiuso, la mappa occupa tutta la pagina.
  protected panelOpen = signal(true);

  goBackToHub() {
    this.appNav.setTab('hub');
  }

  togglePanel() {
    this.panelOpen.update((open) => !open);
  }
}
