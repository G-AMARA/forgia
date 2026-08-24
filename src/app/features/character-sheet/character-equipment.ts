import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { ContentStore } from '../../core/content-store';
import { Modal } from '../../core/modal';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';

// Bozza di armatura/scudo/cavalcatura indossati (tab Inventario) + le due modali di
// selezione. Si risincronizza da zero ogni volta che cambia il personaggio caricato.
@Injectable()
export class CharacterEquipmentService {
  private characterStore = inject(CharacterStore);
  private contentStore = inject(ContentStore);
  private modal = inject(Modal);
  private localeService = inject(LocaleService);
  private context = inject(CharacterSheetContext);

  private allEquipment = this.contentStore.getContent('equipment');
  private classesContent = this.contentStore.getContent('classes');

  readonly selectedArmorId = signal('');
  readonly shieldEquipped = signal(false);
  readonly selectedMountId = signal('');

  readonly armorModalOpen = signal(false);
  readonly mountModalOpen = signal(false);

  // Armature indossabili dal catalogo (esclude lo scudo, gestito a parte come bonus separato).
  readonly availableArmors = computed(() =>
    this.allEquipment().filter(
      (e: any) => e.raw.type === 'Armor' && e.raw.armor_category !== 'shield' && e.raw.armor_class != null
    )
  );

  // Voce del catalogo per l'armatura attualmente selezionata: usata per mostrarne
  // l'immagine (raw.image_url, caricata in Gestione > Equipaggiamento) sotto il select.
  readonly selectedArmor = computed(() =>
    this.availableArmors().find((a: any) => a.id === this.selectedArmorId())
  );

  // Cavalcature e veicoli dal catalogo: is_mount_or_vehicle esclude gli accessori che
  // condividono lo stesso type SRD 'Mounts and Vehicles' (bardature, selle, bisacce da
  // sella, morso e briglia, stallaggio), quelli restano equipaggiamento generico.
  readonly availableMounts = computed(() =>
    this.allEquipment().filter((e: any) => e.raw.type === 'Mounts and Vehicles' && e.raw.is_mount_or_vehicle === true)
  );

  readonly selectedMount = computed(() =>
    this.availableMounts().find((m: any) => m.id === this.selectedMountId())
  );

  constructor() {
    effect(() => {
      const c = this.context.character();
      if (c) {
        this.selectedArmorId.set(c.equipped_armor_id ?? '');
        this.shieldEquipped.set(c.shield_equipped);
        this.selectedMountId.set(c.mount_equipment_id ?? '');
      }
    });
  }

  openArmorModal() {
    this.armorModalOpen.set(true);
  }

  cancelArmorEdit() {
    const c = this.context.character();
    if (c) {
      this.selectedArmorId.set(c.equipped_armor_id ?? '');
      this.shieldEquipped.set(c.shield_equipped);
    }
    this.armorModalOpen.set(false);
  }

  openMountModal() {
    this.mountModalOpen.set(true);
  }

  cancelMountEdit() {
    const c = this.context.character();
    if (c) this.selectedMountId.set(c.mount_equipment_id ?? '');
    this.mountModalOpen.set(false);
  }

  // Difesa Senza Armatura (Barbaro: Cos, Monaco: Sag, ecc.): quale caratteristica extra si
  // somma a Destrezza quando la classe non indossa armatura, configurato per classe in
  // Gestione > Classi (classes.unarmored_defense_ability) invece che dedotto dal nome
  // della classe — il nome è testo libero modificabile in Gestione, non un identificatore
  // stabile su cui riconoscere "è il Barbaro".
  unarmoredDefenseAbility(): string | null {
    const c = this.context.character();
    if (!c || !c.class_id) return null;
    return this.classesContent().find((cls: any) => cls.id === c.class_id)?.raw?.unarmored_defense_ability ?? null;
  }

  async saveMount() {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;

    const { error } = await this.characterStore.updateMount(c.id, this.selectedMountId() || null);
    if (error) {
      this.modal.error(error.message);
      return;
    }

    this.mountModalOpen.set(false);
    this.modal.success(this.localeService.t('saved_message'));
  }
}
