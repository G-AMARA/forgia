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

  async removeWeapon(rowId: string, name: string) {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_remove_weapon')} "${name}"?`);
    if (!confirmed) return;
    const { error } = await this.characterStore.removeWeapon(c.id, rowId);
    if (error) this.modal.error(error.message);
  }
}
