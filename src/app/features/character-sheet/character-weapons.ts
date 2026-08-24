import { Injectable, computed, inject, signal } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { ContentStore } from '../../core/content-store';
import { Modal } from '../../core/modal';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';

// Armi possedute dal personaggio (tab Armi): aggiunta dal catalogo, rimozione, e riga
// selezionata per il pannello di dettaglio.
@Injectable()
export class CharacterWeaponsService {
  private characterStore = inject(CharacterStore);
  private contentStore = inject(ContentStore);
  private modal = inject(Modal);
  private localeService = inject(LocaleService);
  private context = inject(CharacterSheetContext);

  readonly availableWeaponsCatalog = this.contentStore.getContent('weapons');

  readonly selectedWeaponId = signal('');
  readonly weaponQuantity = signal(1);

  // Riga arma selezionata nel tab Armi: un click la apre nel "libro" sotto la tabella
  // (immagine a sinistra, dettagli a destra), un secondo click sulla stessa riga la chiude.
  readonly selectedWeaponRowId = signal<string | null>(null);

  // Quantità da rimuovere per ogni riga, stesso pattern di CharacterInventoryService:
  // un input accanto al bottone Rimuovi, default 1 finché non toccato.
  private removeQuantities: Record<string, number> = {};

  // Modale di conferma rimozione arma (app-generic-modal in character-weapons-table.html),
  // stessa modale generica riusata da CharacterInventoryService.
  readonly isModalOpen = signal(false);
  readonly localModalTitle = signal('');
  readonly localModalImageSrc = signal<string | null>(null);
  readonly localModalImageAlt = signal<string | null>(null);
  readonly localModalCancelLabel = signal('');
  readonly localModalConfirmLabel = signal('');
  readonly localModalVariant = signal<'success' | 'error' | 'warning' | 'confirm'>('confirm');
  modalItemName = '';
  private pendingRemoval: { rowId: string; currentQuantity: number; quantityToRemove: number } | null = null;

  readonly selectedWeaponDetail = computed(() => {
    const c = this.context.character();
    if (!c) return null;
    return c.weapons.find((w) => w.rowId === this.selectedWeaponRowId()) ?? null;
  });

  toggleWeaponSelection(rowId: string) {
    this.selectedWeaponRowId.update((current) => (current === rowId ? null : rowId));
  }

  attackAbilityNames(abilities: string[]): string {
    return abilities.map((a) => this.localeService.t('ability_' + a)).join(' ' + this.localeService.t('or_label') + ' ');
  }

  async addWeapon() {
    const c = this.context.character();
    if (!c || !this.selectedWeaponId() || this.context.readOnly()) return;

    const { error } = await this.characterStore.addWeapon(c.id, {
      weaponId: this.selectedWeaponId(),
      quantity: this.weaponQuantity(),
    });

    if (error) {
      this.modal.error(error.message);
      return;
    }

    this.selectedWeaponId.set('');
    this.weaponQuantity.set(1);
  }

  removeQty(rowId: string): number {
    return this.removeQuantities[rowId] ?? 1;
  }

  setRemoveQty(rowId: string, value: number) {
    this.removeQuantities[rowId] = Math.max(1, Math.floor(value) || 1);
  }

  openRemoveModal(rowId: string, currentQuantity: number, name: string) {
    const qty = this.removeQty(rowId);
    this.localModalTitle.set(this.localeService.t('remove_character_item_modal_title'));
    this.localModalImageSrc.set('modal-png/allert-goblin.png');
    this.localModalImageAlt.set(this.localeService.t('generic_modal_alert_alt_img'));
    this.localModalCancelLabel.set(this.localeService.t('remove_character_item_modal_cancel'));
    this.localModalConfirmLabel.set(this.localeService.t('remove_character_item_modal_confirm'));
    this.localModalVariant.set('warning');
    this.modalItemName = qty > 1 ? `${qty}× ${name}` : name;
    this.pendingRemoval = { rowId, currentQuantity, quantityToRemove: Math.min(qty, currentQuantity) };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.pendingRemoval = null;
  }

  async confirmRemoveWeapon() {
    const c = this.context.character();
    const pending = this.pendingRemoval;
    this.closeModal();
    if (!c || this.context.readOnly() || !pending) return;

    const { error } = await this.characterStore.removeWeapon(
      c.id,
      pending.rowId,
      pending.quantityToRemove,
      pending.currentQuantity
    );
    if (error) {
      this.modal.error(error.message);
      return;
    }
    delete this.removeQuantities[pending.rowId];
  }
}
