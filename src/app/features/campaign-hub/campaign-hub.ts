import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveCampaign } from '../../core/active-campaign';
import { CharacterStore } from '../../core/character-store';
import { Auth } from '../../core/auth';
import { AppNav } from '../../core/app-nav';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { getCover, getCoverImagePath } from '../../core/campaign-covers';
import { formatDateTime } from '../../core/datetime-local';
import { Bestiary } from '../bestiary/bestiary';
import { Npc } from '../npc/npc';
import { Maps } from '../maps/maps';

type CampaignSection = 'npc' | 'bestiary' | 'maps';

@Component({
  selector: 'app-campaign-hub',
  standalone: true,
  imports: [Bestiary, Npc, Maps],
  templateUrl: './campaign-hub.html',
})
export class CampaignHub {
  protected campaignStore = inject(ActiveCampaign);
  protected characterStore = inject(CharacterStore);
  protected auth = inject(Auth);
  protected appNav = inject(AppNav);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);
  private router = inject(Router);

  cover = computed(() => {
    const campaign = this.campaignStore.current();
    return campaign ? getCover(campaign.cover_key) : null;
  });

  getCoverImagePath = getCoverImagePath;

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

  goToCharacters() {
    this.appNav.setTab('characters');
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

  async deleteCharacter(event: Event, characterId: string, characterName: string) {
    event.stopPropagation(); // evita che il click apra anche la scheda
    //controlla in giro per il codcie di inserire e creare le firme giuste per le modali di conferma.
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_character')} "${characterName}"?`,
      {
        cancelLabel: this.localeService.t('cancel_button'),
        confirmLabel: this.localeService.t('confirm_delete_button_confirm'),
      }
    );
    if (!confirmed) return;

    const { error } = await this.characterStore.deleteCharacter(characterId);
    if (error) {
      this.modal.error(error.message);
    }
    else{
      let confirmed = await this.modal.success(
        `${this.localeService.t('character_deleted_msg_1')} "${characterName}" ${this.localeService.t('character_deleted_msg_2')}`
      );
      if(!confirmed) return;
    }
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
