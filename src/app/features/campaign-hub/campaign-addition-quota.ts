import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Auth } from '../../core/auth';
import { ActiveCampaign } from '../../core/active-campaign';
import { LocaleService } from '../../core/locale';
import { NpcStore } from '../../core/npc-store';
import { BestiaryStore } from '../../core/bestiary-store';
import { MapAlbumsStore } from '../../core/map-albums';
import { RANK_TIERS, RankTier, campaignAdditionLimitForTier, getRankForSeconds } from '../../core/ranks';

// Avviso "quanto puoi ancora aggiungere" mostrato in CampaignHub sopra i tab PNG/Bestiario/
// Mappe, più un'icona che apre lo specchietto con la progressione completa per rango
// (Adepto -> Signore, Fato escluso perché illimitato, vedi RANK_TIERS/FATO_RANK in
// core/ranks.ts). Componente autonomo con la propria canManage (stessa logica di
// Npc/Bestiary/Maps, per difesa in profondità) invece di un booleano passato dal parent, e
// per non appesantire ulteriormente CampaignHub (già oltre le righe consigliate).
@Component({
  selector: 'app-campaign-addition-quota',
  standalone: true,
  templateUrl: './campaign-addition-quota.html',
})
export class CampaignAdditionQuota {
  private auth = inject(Auth);
  private activeCampaign = inject(ActiveCampaign);
  protected npcStore = inject(NpcStore);
  protected bestiaryStore = inject(BestiaryStore);
  protected mapAlbumsStore = inject(MapAlbumsStore);
  protected localeService = inject(LocaleService);

  readonly campaignId = input.required<string>();

  protected readonly Infinity = Infinity;
  protected readonly rankTiers = RANK_TIERS;
  protected readonly limitForTier = campaignAdditionLimitForTier;

  protected canManage = computed(() => {
    const campaign = this.activeCampaign.current();
    const userId = this.auth.user()?.id;
    return (!!campaign && !!userId && campaign.owner_id === userId) || this.auth.isAdmin();
  });

  protected myRank = computed<RankTier>(() => getRankForSeconds(this.auth.navigationSeconds(), this.auth.isAdmin()));

  protected showInfo = signal(false);

  constructor() {
    // Il banner deve mostrare contatori corretti anche prima che l'utente apra uno dei tre
    // tab (che oggi caricano i propri dati solo al proprio ngOnInit, vedi Npc/Bestiary/Maps):
    // li carico qui non appena la campagna attiva è nota. Idempotente se un tab li ricarica
    // comunque dopo (stessa query, nessun effetto collaterale).
    effect(() => {
      const campaignId = this.campaignId();
      if (!campaignId) return;
      this.npcStore.loadCatalog();
      this.bestiaryStore.loadSelectionForCampaign(campaignId);
      this.mapAlbumsStore.loadAlbums(campaignId);
    });
  }

  openInfo() {
    this.showInfo.set(true);
  }

  closeInfo() {
    this.showInfo.set(false);
  }
}
