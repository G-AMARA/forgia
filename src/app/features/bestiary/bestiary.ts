import { CUSTOM_ELEMENTS_SCHEMA, Component, Input, OnInit, computed, inject, output, signal } from '@angular/core';
import { BestiaryMonster, BestiaryStore } from '../../core/bestiary-store';
import { Auth } from '../../core/auth';
import { ActiveCampaign } from '../../core/active-campaign';
import { CampaignTokens, TOKEN_PLACEHOLDER_AVATAR } from '../../core/campaign-tokens';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { BoardViewport } from '../play/components/interactive-board/board-viewport';
import { ensureSwiperRegistered } from '../../core/swiper-register';
import { MonsterDetailCard } from './monster-detail-card';
import { MonsterPicker } from './monster-picker';

@Component({
  selector: 'app-bestiary',
  standalone: true,
  imports: [MonsterPicker, MonsterDetailCard],
  templateUrl: './bestiary.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // richiesto da <swiper-container>/<swiper-slide> (web component di swiper/element)
})
export class Bestiary implements OnInit {
  protected bestiaryStore = inject(BestiaryStore);
  protected auth = inject(Auth);
  private activeCampaign = inject(ActiveCampaign);
  private campaignTokens = inject(CampaignTokens);
  // Opzionale: BoardViewport è fornito solo dentro la pagina "Gioca" (vedi Play). Nel
  // quadro campagna (CampaignHub), dove questo stesso componente è riusato, resta null e
  // il pulsante "Piazza sulla Mappa" non compare (vedi canPlaceOnMap).
  private viewport = inject(BoardViewport, { optional: true });
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);
  // Il template non risolve i globali JS: serve esposto per nascondere la quota quando il
  // rango è Fato (BestiaryStore.myBestiaryLimit()), come Npc.Infinity.
  protected readonly Infinity = Infinity;

  @Input() campaignId!: string;

  readonly tokensChanged = output<void>();

  // Ricalcolato qui invece di fidarsi di un booleano passato dal parent: stessa logica
  // di CampaignHub.isOwner, per difesa in profondità (la RLS lato DB è comunque
  // l'ultima parola, ma la UI non deve fidarsi ciecamente di uno stato esterno).
  protected canManage = computed(() => {
    const campaign = this.activeCampaign.current();
    const userId = this.auth.user()?.id;
    return (!!campaign && !!userId && campaign.owner_id === userId) || this.auth.isAdmin();
  });

  protected canPlaceOnMap = computed(() => this.canManage() && !!this.viewport);

  // Il catalogo è globale (Gestione > Bestiario); qui si filtra solo ciò che il DM ha
  // scelto per questa campagna (tabella ponte campaign_bestiary_monsters).
  protected selectedMonsters = computed<BestiaryMonster[]>(() => {
    const ids = this.bestiaryStore.selectedIds();
    return this.bestiaryStore.catalog().filter((m) => ids.has(m.id));
  });

  protected selectedIndex = signal(0);
  protected selectedMonster = computed<BestiaryMonster | null>(
    () => this.selectedMonsters()[this.selectedIndex()] ?? null
  );

  protected pickerOpen = signal(false);

  ngOnInit() {
    ensureSwiperRegistered();
    this.bestiaryStore.loadCatalog();
    this.bestiaryStore.loadSelectionForCampaign(this.campaignId);
  }

  // Sincronizza il pannello dettagli sotto il mazzo con la carta scoperta in cima dopo
  // uno swipe (tramite dita o le frecce native di Swiper): niente più selezione manuale
  // da miniature, il "raccoglitore" si sfoglia solo in sequenza.
  onSlideChange(event: any) {
    const activeIndex = event.detail?.[0]?.activeIndex ?? event.target.swiper?.activeIndex;
    if (typeof activeIndex === 'number') {
      this.selectedIndex.set(activeIndex);
    }
  }

  async placeOnMap(monster: BestiaryMonster) {
    if (!this.viewport) return;
    const center = this.viewport.getViewportCenter();
    const token = await this.campaignTokens.insert({
      campaignId: this.campaignId,
      characterId: null,
      name: monster.name,
      avatarUrl: monster.image_url || TOKEN_PLACEHOLDER_AVATAR,
      x: center.x,
      y: center.y,
      kind: 'monster',
    });

    if (!token) return;
    this.tokensChanged.emit();
  }

  // Rimozione diretta dalla card di dettaglio (in cima al mazzo), senza dover riaprire il
  // picker e ritrovare/deselezionare lo stesso mostro da lì: stessa mutazione di
  // MonsterPicker.toggle sul ramo "già selezionato", solo raggiunta da un altro punto della UI.
  async removeFromCampaign(monster: BestiaryMonster) {
    const { error } = await this.bestiaryStore.removeFromCampaign(this.campaignId, monster.id);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    const count = this.selectedMonsters().length;
    if (this.selectedIndex() >= count) {
      this.selectedIndex.set(Math.max(0, count - 1));
    }
  }

  openPicker() {
    this.pickerOpen.set(true);
  }

  onPickerClosed() {
    this.pickerOpen.set(false);
    // La selezione può essere cambiata: l'indice attivo potrebbe puntare fuori lista.
    const count = this.selectedMonsters().length;
    if (this.selectedIndex() >= count) {
      this.selectedIndex.set(Math.max(0, count - 1));
    }
  }
}
