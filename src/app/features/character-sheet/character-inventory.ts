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

  async removeItem(rowId: string, currentQuantity: number, name: string) {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_remove_item')} "${name}"?`);
    if (!confirmed) return;
    const quantityToRemove = Math.min(this.removeQty(rowId), currentQuantity);
    const { error } = await this.characterStore.removeInventoryItem(c.id, rowId, quantityToRemove, currentQuantity);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    delete this.removeQuantities[rowId];
  }

  async toggleEquip(rowId: string, currentlyEquipped: boolean) {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;
    const { error } = await this.characterStore.toggleEquipped(c.id, rowId, !currentlyEquipped);
    if (error) this.modal.error(error.message);
  }
}
