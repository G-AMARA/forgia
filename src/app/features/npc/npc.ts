import { CUSTOM_ELEMENTS_SCHEMA, Component, Input, OnInit, computed, inject, output, signal } from '@angular/core';
import { NpcCharacter, NpcStore } from '../../core/npc-store';
import { Auth } from '../../core/auth';
import { ActiveCampaign } from '../../core/active-campaign';
import { CampaignTokens, TOKEN_PLACEHOLDER_AVATAR } from '../../core/campaign-tokens';
import { LocaleService } from '../../core/locale';
import { BoardViewport } from '../play/components/interactive-board/board-viewport';
import { ensureSwiperRegistered } from '../../core/swiper-register';
import { NpcDetailCard } from './npc-detail-card';
import { NpcPicker } from './npc-picker';
import { NpcForm } from '../manage/npc-manage/npc-form';

@Component({
  selector: 'app-npc',
  standalone: true,
  imports: [NpcPicker, NpcDetailCard, NpcForm],
  templateUrl: './npc.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // richiesto da <swiper-container>/<swiper-slide> (web component di swiper/element)
})
export class Npc implements OnInit {
  protected npcStore = inject(NpcStore);
  protected auth = inject(Auth);
  private activeCampaign = inject(ActiveCampaign);
  private campaignTokens = inject(CampaignTokens);
  // Opzionale: BoardViewport è fornito solo dentro la pagina "Gioca" (vedi Play). Nel
  // quadro campagna (CampaignHub), dove questo stesso componente è riusato, resta null e
  // il pulsante "Piazza sulla Mappa" non compare (vedi canPlaceOnMap).
  private viewport = inject(BoardViewport, { optional: true });
  protected localeService = inject(LocaleService);
  // Il template non risolve i globali JS: serve esposto per nascondere la quota quando il
  // rango è Fato (NpcStore.myNpcLimit()).
  protected readonly Infinity = Infinity;

  @Input() campaignId!: string;

  readonly tokensChanged = output<void>();

  // Stessa logica di CampaignHub.isOwner/Bestiary.canManage, per difesa in profondità.
  protected canManage = computed(() => {
    const campaign = this.activeCampaign.current();
    const userId = this.auth.user()?.id;
    return (!!campaign && !!userId && campaign.owner_id === userId) || this.auth.isAdmin();
  });

  protected canPlaceOnMap = computed(() => this.canManage() && !!this.viewport);

  // Il catalogo è globale (Gestione > PNG); qui si filtra solo ciò che il DM ha scelto
  // per questa campagna (tabella ponte campaign_npc_characters).
  protected selectedNpcs = computed<NpcCharacter[]>(() => {
    const ids = this.npcStore.selectedIds();
    return this.npcStore.catalog().filter((n) => ids.has(n.id));
  });

  protected selectedIndex = signal(0);
  protected selectedNpc = computed<NpcCharacter | null>(
    () => this.selectedNpcs()[this.selectedIndex()] ?? null
  );

  protected pickerOpen = signal(false);
  // Come il picker, riservato al Master/admin (canManage): entro la quota del proprio
  // rango araldico (vedi NpcStore.canCreateNpc), non un catalogo condiviso illimitato.
  protected npcCreateOpen = signal(false);

  ngOnInit() {
    ensureSwiperRegistered();
    this.npcStore.loadCatalog();
    this.npcStore.loadSelectionForCampaign(this.campaignId);
  }

  // Sincronizza il pannello dettagli sotto il mazzo con la carta scoperta in cima dopo
  // uno swipe, esattamente come Bestiary.onSlideChange.
  onSlideChange(event: any) {
    const activeIndex = event.detail?.[0]?.activeIndex ?? event.target.swiper?.activeIndex;
    if (typeof activeIndex === 'number') {
      this.selectedIndex.set(activeIndex);
    }
  }

  async placeOnMap(npc: NpcCharacter) {
    if (!this.viewport) return;
    const center = this.viewport.getViewportCenter();
    const token = await this.campaignTokens.insert({
      campaignId: this.campaignId,
      characterId: null,
      name: npc.name,
      avatarUrl: npc.image_url || TOKEN_PLACEHOLDER_AVATAR,
      x: center.x,
      y: center.y,
      kind: 'npc',
    });

    if (!token) return;
    this.tokensChanged.emit();
  }

  openPicker() {
    this.pickerOpen.set(true);
  }

  openCreateForm() {
    this.npcCreateOpen.set(true);
  }

  onCreateFormClosed() {
    this.npcCreateOpen.set(false);
  }

  onPickerClosed() {
    this.pickerOpen.set(false);
    // La selezione può essere cambiata: l'indice attivo potrebbe puntare fuori lista.
    const count = this.selectedNpcs().length;
    if (this.selectedIndex() >= count) {
      this.selectedIndex.set(Math.max(0, count - 1));
    }
  }
}
