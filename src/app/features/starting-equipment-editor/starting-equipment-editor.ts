import { Component, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { LocaleService } from '../../core/locale';
import {
  EquipmentChoiceGroup,
  EquipmentRef,
  ToolCategoryTag,
  WeaponCategoryTag,
} from '../../core/starting-equipment';

const WEAPON_CATEGORY_TAGS: WeaponCategoryTag[] = [
  'simple', 'simple_melee', 'simple_ranged', 'martial', 'martial_melee', 'martial_ranged',
];
const TOOL_CATEGORY_TAGS: ToolCategoryTag[] = ['artisan_tools', 'musical_instrument'];

// Editor condiviso per classes.starting_equipment / backgrounds.starting_equipment: usato sia
// da class-create che da background-create (stesso contratto, stessa UI a gruppi/opzioni/ref).
// Sostituisce le migration SQL scritte a mano finora per questo campo.
@Component({
  selector: 'app-starting-equipment-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './starting-equipment-editor.html',
})
export class StartingEquipmentEditor {
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  groups = model.required<EquipmentChoiceGroup[]>();

  protected weapons = this.contentStore.getContent('weapons');
  protected equipment = this.contentStore.getContent('equipment');

  protected weaponCategoryTags = WEAPON_CATEGORY_TAGS;
  protected toolCategoryTags = TOOL_CATEGORY_TAGS;

  // Ogni mutazione clona l'array corrente (piccolo, editing raro: la semplicità vince sulla
  // micro-ottimizzazione) e riassegna il model, così il componente ospite si aggiorna via binding.
  private update(mutator: (groups: EquipmentChoiceGroup[]) => void) {
    const clone: EquipmentChoiceGroup[] = structuredClone(this.groups());
    mutator(clone);
    this.groups.set(clone);
  }

  addGroup() {
    this.update((groups) => {
      groups.push({ key: `group-${groups.length + 1}`, options: [{ refs: [] }] });
    });
  }

  removeGroup(groupIndex: number) {
    this.update((groups) => groups.splice(groupIndex, 1));
  }

  setGroupKey(groupIndex: number, key: string) {
    this.update((groups) => (groups[groupIndex].key = key));
  }

  addOption(groupIndex: number) {
    this.update((groups) => groups[groupIndex].options.push({ refs: [] }));
  }

  removeOption(groupIndex: number, optionIndex: number) {
    this.update((groups) => groups[groupIndex].options.splice(optionIndex, 1));
  }

  addRef(groupIndex: number, optionIndex: number) {
    this.update((groups) =>
      groups[groupIndex].options[optionIndex].refs.push({ kind: 'item', table: 'equipment', name: '' })
    );
  }

  removeRef(groupIndex: number, optionIndex: number, refIndex: number) {
    this.update((groups) => groups[groupIndex].options[optionIndex].refs.splice(refIndex, 1));
  }

  setRefKind(groupIndex: number, optionIndex: number, refIndex: number, kind: 'item' | 'category') {
    this.update((groups) => {
      const ref = groups[groupIndex].options[optionIndex].refs[refIndex];
      groups[groupIndex].options[optionIndex].refs[refIndex] =
        kind === 'item'
          ? { kind: 'item', table: ref.table, name: '', quantity: ref.quantity }
          : {
              kind: 'category',
              table: ref.table,
              category: ref.table === 'weapons' ? 'simple' : 'artisan_tools',
              quantity: ref.quantity,
            };
    });
  }

  setRefTable(groupIndex: number, optionIndex: number, refIndex: number, table: 'weapons' | 'equipment') {
    this.update((groups) => {
      const ref = groups[groupIndex].options[optionIndex].refs[refIndex];
      ref.table = table;
      if (ref.kind === 'item') ref.name = '';
      else ref.category = table === 'weapons' ? 'simple' : 'artisan_tools';
    });
  }

  setRefName(groupIndex: number, optionIndex: number, refIndex: number, name: string) {
    this.update((groups) => {
      const ref = groups[groupIndex].options[optionIndex].refs[refIndex];
      if (ref.kind === 'item') ref.name = name;
    });
  }

  setRefCategory(groupIndex: number, optionIndex: number, refIndex: number, category: string) {
    this.update((groups) => {
      const ref = groups[groupIndex].options[optionIndex].refs[refIndex];
      if (ref.kind === 'category') ref.category = category as WeaponCategoryTag | ToolCategoryTag;
    });
  }

  setRefQuantity(groupIndex: number, optionIndex: number, refIndex: number, quantity: number) {
    this.update((groups) => {
      groups[groupIndex].options[optionIndex].refs[refIndex].quantity = quantity > 1 ? quantity : undefined;
    });
  }

  itemOptionsFor(ref: EquipmentRef): any[] {
    return ref.table === 'weapons' ? this.weapons() : this.equipment();
  }

  categoryLabel(table: 'weapons' | 'equipment', category: string): string {
    const key = table === 'weapons' ? `weapon_category_${category}` : `tool_category_${category}`;
    return this.localeService.t(key);
  }
}
