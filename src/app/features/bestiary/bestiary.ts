import { CUSTOM_ELEMENTS_SCHEMA, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { BestiaryMonster, BestiaryStore } from '../../core/bestiary-store';
import { Auth } from '../../core/auth';
import { ActiveCampaign } from '../../core/active-campaign';
import { LocaleService } from '../../core/locale';
import { MonsterPicker } from './monster-picker';

// Registrato al volo (non in main.ts): il bundle di swiper/element include tutti i moduli
// (~600kB) e sforerebbe il budget del bundle iniziale se caricato eagerly. Il flag evita
// la doppia registrazione se il componente viene ricreato (customElements.define lancia
// se richiamato due volte sullo stesso tag).
let swiperRegistered: Promise<void> | null = null;
function ensureSwiperRegistered(): Promise<void> {
  if (!swiperRegistered) {
    swiperRegistered = import('swiper/element/bundle').then(({ register }) => register());
  }
  return swiperRegistered;
}

@Component({
  selector: 'app-bestiary',
  standalone: true,
  imports: [MonsterPicker],
  templateUrl: './bestiary.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // richiesto da <swiper-container>/<swiper-slide> (web component di swiper/element)
})
export class Bestiary implements OnInit {
  protected bestiaryStore = inject(BestiaryStore);
  protected auth = inject(Auth);
  private activeCampaign = inject(ActiveCampaign);
  protected localeService = inject(LocaleService);

  @Input() campaignId!: string;

  // Ricalcolato qui invece di fidarsi di un booleano passato dal parent: stessa logica
  // di CampaignHub.isOwner, per difesa in profondità (la RLS lato DB è comunque
  // l'ultima parola, ma la UI non deve fidarsi ciecamente di uno stato esterno).
  protected canManage = computed(() => {
    const campaign = this.activeCampaign.current();
    const userId = this.auth.user()?.id;
    return (!!campaign && !!userId && campaign.owner_id === userId) || this.auth.isAdmin();
  });

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

  // Formula standard D&D 5e: modificatore = floor((punteggio - 10) / 2). Non salvato su
  // DB, calcolato al volo qui come già avviene in character-sheet/character-create.
  abilityModifier(score: number | null): string {
    if (score === null) return '—';
    const modifier = Math.floor((score - 10) / 2);
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
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
