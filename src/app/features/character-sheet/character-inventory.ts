import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { ContentStore } from '../../core/content-store';
import { Modal } from '../../core/modal';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterEquipmentService } from './character-equipment';

// Bozza di valuta (tab Inventario) + gestione dell'inventario oggetti (ricerca, aggiunta,
// rimozione, equip/unequip) e del peso totale trasportato.
@Injectable()
export class CharacterInventoryService {
  private characterStore = inject(CharacterStore);
  private contentStore = inject(ContentStore);
  private modal = inject(Modal);
  private localeService = inject(LocaleService);
  private context = inject(CharacterSheetContext);
  private equipment = inject(CharacterEquipmentService);

  private allEquipment = this.contentStore.getContent('equipment');

  readonly copper = signal(0);
  readonly silver = signal(0);
  readonly electrum = signal(0);
  readonly gold = signal(0);
  readonly platinum = signal(0);

  readonly equipmentSearchTerm = signal('');
  readonly selectedEquipmentId = signal('');
  readonly addQuantity = signal(1);

  // Quantità da rimuovere per ogni riga d'inventario, tenuta per rowId perché ogni oggetto
  // ha il proprio input accanto al bottone Rimuovi (default 1 finché non toccato).
  private removeQuantities: Record<string, number> = {};

  // Modale di conferma rimozione oggetto (app-generic-modal in character-inventory-list.html).
  readonly isModalOpen = signal(false);
  readonly localModalTitle = signal('');
  readonly localModalImageSrc = signal<string | null>(null);
  readonly localModalImageAlt = signal<string | null>(null);
  readonly localModalCancelLabel = signal('');
  readonly localModalConfirmLabel = signal('');
  readonly localModalVariant = signal<'success' | 'error' | 'warning' | 'confirm'>('confirm');
  modalItemName = '';
  private pendingRemoval: { rowId: string; currentQuantity: number; quantityToRemove: number } | null = null;

  readonly availableEquipment = computed(() => {
    const term = this.equipmentSearchTerm().trim().toLowerCase();
    const equipment = this.allEquipment();
    if (!term) return equipment;
    return equipment.filter((item: any) => item.name.toLowerCase().includes(term));
  });

  // Peso complessivo: armatura indossata + solo gli oggetti d'inventario spuntati come
  // equipaggiati (quantità incluse), non l'intero inventario, + tutte le armi portate
  // (niente flag "equipaggiata" per le armi, si contano tutte). weight è già in kg così
  // com'è in DB: nessuna conversione qui.
  totalCarriedWeightKg(): string {
    const c = this.context.character();
    if (!c) return '0.0';
    const armorWeight = this.equipment.selectedArmor()?.raw?.weight ?? 0;
    const equippedWeight = c.inventory
      .filter((item) => item.equipped)
      .reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const weaponsWeight = c.weapons.reduce((sum, w) => sum + (w.weight ?? 0) * w.quantity, 0);
    return (armorWeight + equippedWeight + weaponsWeight).toFixed(1);
  }

  constructor() {
    effect(() => {
      const c = this.context.character();
      if (c) {
        this.copper.set(c.copper ?? 0);
        this.silver.set(c.silver ?? 0);
        this.electrum.set(c.electrum ?? 0);
        this.gold.set(c.gold ?? 0);
        this.platinum.set(c.platinum ?? 0);
      }
    });
  }

  async saveCurrency() {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;
    await this.characterStore.updateCurrency(c.id, {
      copper: this.copper(),
      silver: this.silver(),
      electrum: this.electrum(),
      gold: this.gold(),
      platinum: this.platinum(),
    });
    this.modal.success(this.localeService.t('saved_message'));
  }

  async addItem() {
    const c = this.context.character();
    if (!c || !this.selectedEquipmentId() || this.context.readOnly()) return;
    const { error } = await this.characterStore.addInventoryItem(c.id, this.selectedEquipmentId(), this.addQuantity());
    if (error) {
      this.modal.error(error.message);
      return;
    }
    this.selectedEquipmentId.set('');
    this.addQuantity.set(1);
  }

  removeQty(rowId: string): number {
    return this.removeQuantities[rowId] ?? 1;
  }

  setRemoveQty(rowId: string, value: number) {
    this.removeQuantities[rowId] = Math.max(1, Math.floor(value) || 1);
  }

  openRemoveModal(rowId: string, currentQuantity: number, name: string) {
    const qty = this.removeQty(rowId);
    // Se la quantità è maggiore di 1, mostriamo il moltiplicatore nel titolo della modale.
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

  async confirmRemoveItem() {
    const c = this.context.character();
    const pending = this.pendingRemoval;
    this.closeModal();
    if (!c || this.context.readOnly() || !pending) return;

    const { error } = await this.characterStore.removeInventoryItem(
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

  async toggleEquip(rowId: string, currentlyEquipped: boolean) {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;
    const { error } = await this.characterStore.toggleEquipped(c.id, rowId, !currentlyEquipped);
    if (error) this.modal.error(error.message);
  }
}
