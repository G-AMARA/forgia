import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveCampaign } from '../../core/active-campaign';
import { CharacterStore, CharacterSummary } from '../../core/character-store';
import { Auth } from '../../core/auth';
import { AppNav } from '../../core/app-nav';
import { LocaleService } from '../../core/locale';
import { getCover, getCoverImagePath } from '../../core/campaign-covers';
import { CHARACTER_CARDS, getCardImagePath } from '../../core/character-cards';
import { formatDateTime } from '../../core/datetime-local';
import { Bestiary } from '../bestiary/bestiary';
import { Npc } from '../npc/npc';
import { Maps } from '../maps/maps';
import { AddHeroModal } from './add-hero-modal';
import { PlayerHeraldryModal } from './player-heraldry-modal';
import { EditHeroModal } from './edit-hero-modal';
import { CampaignAdditionQuota } from './campaign-addition-quota';

type CampaignSection = 'npc' | 'bestiary' | 'maps';

interface HeraldryModalTarget {
  ownerId: string;
  ownerNickname: string;
}

@Component({
  selector: 'app-campaign-hub',
  standalone: true,
  imports: [Bestiary, Npc, Maps, AddHeroModal, PlayerHeraldryModal, EditHeroModal, CampaignAdditionQuota],
  templateUrl: './campaign-hub.html',
})
export class CampaignHub {
  protected campaignStore = inject(ActiveCampaign);
  protected characterStore = inject(CharacterStore);
  protected auth = inject(Auth);
  protected appNav = inject(AppNav);
  protected localeService = inject(LocaleService);
  private router = inject(Router);

  cover = computed(() => {
    const campaign = this.campaignStore.current();
    return campaign ? getCover(campaign.cover_key) : null;
  });

  getCoverImagePath = getCoverImagePath;

  // Card di sfondo del personaggio nel roster (scelta in add-hero-modal, vedi
  // core/character-cards.ts): risolta per key invece che passare l'intero oggetto perché
  // CharacterSummary salva solo card_key, non la entry completa del catalogo.
  getCharacterCardPath(cardKey: string): string {
    const card = CHARACTER_CARDS.find((c) => c.key === cardKey) ?? CHARACTER_CARDS[0];
    return getCardImagePath(card);
  }

  formatNextSession(iso: string | null): string | null {
    return formatDateTime(iso, this.localeService.locale());
  }

  isOwner = computed(() => {
    const campaign = this.campaignStore.current();
    const userId = this.auth.user()?.id;
    return !!campaign && !!userId && campaign.owner_id === userId;
  });

  hasOwnCharacter = computed(() => {
    const userId = this.auth.user()?.id;
    if (!userId) return false;
    return this.characterStore.characters().some((c) => c.owner_id === userId);
  });

  // Picker "Aggiungi il tuo Eroe": mostra i PG del parco personale non ancora assegnati
  // a una campagna (vedi AddHeroModal), invece di creare un PG nuovo direttamente qui.
  showAddHeroModal = signal(false);

  openAddHeroModal() {
    this.showAddHeroModal.set(true);
  }

  closeAddHeroModal() {
    this.showAddHeroModal.set(false);
  }

  // Popup "araldica altrui" (bottone oro col nickname sulle card del roster non tue):
  // chi vede la card di un compagno clicca lì invece del bottone rosso "Rimuovi/Elimina".
  heraldryModalTarget = signal<HeraldryModalTarget | null>(null);

  openHeraldryModal(event: Event, ownerId: string, ownerNickname: string | null) {
    event.stopPropagation();
    this.heraldryModalTarget.set({ ownerId, ownerNickname: ownerNickname ?? '???' });
  }

  closeHeraldryModal() {
    this.heraldryModalTarget.set(null);
  }

  // Menu "Modifica" sulla propria card (cambia PG/card, o rimuovi dalla campagna),
  // vedi EditHeroModal. Sostituisce il vecchio bottone diretto "Rimuovi" per l'owner.
  editHeroModalTarget = signal<CharacterSummary | null>(null);

  openEditHeroModal(event: Event, character: CharacterSummary) {
    event.stopPropagation();
    this.editHeroModalTarget.set(character);
  }

  closeEditHeroModal() {
    this.editHeroModalTarget.set(null);
  }

  // Porta alla pagina "Gioca" (/gioca/:campaignId): il Master la vede sempre (non serve
  // un proprio personaggio), il giocatore solo se ha già un personaggio nel roster —
  // la colonna sinistra della pagina mostra proprio quello.
  goToPlaySession() {
    const campaignId = this.campaignStore.current()?.id;
    if (!campaignId) return;

    this.appNav.setTab('play');
    this.router.navigate(['/gioca', campaignId]);
  }

  // Apre la scheda di un personaggio del roster (proprio o altrui). Chi non è
  // il proprietario la vede in sola lettura: lo gestisce CharacterSheet stesso.
  goToCharacterSheet(characterId: string) {
    this.appNav.setTab('character-sheet');
    this.router.navigate(['/scheda-personaggio', characterId]);
  }

  togglePlayEnabled() {
    const campaign = this.campaignStore.current();
    if (!campaign) return;
    this.campaignStore.setPlayEnabled(campaign.id, !campaign.play_enabled);
  }

  goToManage() {
    this.appNav.setTab('campaign-edit');
  }

  // Stato locale a questo componente (non in AppNav, che guida la navigazione a livello
  // di app): un semplice accordion a una sola sezione aperta per volta, per le tre card
  // "PNG" / "Bestiario" / "Mappe e luoghi".
  expandedSection = signal<CampaignSection | null>(null);

  toggleSection(section: CampaignSection) {
    this.expandedSection.set(this.expandedSection() === section ? null : section);
  }
}
