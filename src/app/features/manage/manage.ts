import { Component, inject, signal } from '@angular/core';
import { WeaponCreate } from '../weapon-create/weapon-create';
import { SpellCreate } from '../spell-create/spell-create';
import { EquipmentCreate } from '../equipment-create/equipment-create';
import { LocaleService } from '../../core/locale';

type ManageSection = 'weapons' | 'spells' | 'equipment';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [WeaponCreate, SpellCreate, EquipmentCreate],
  templateUrl: './manage.html',
})
export class Manage {
  protected localeService = inject(LocaleService);

  activeSection = signal<ManageSection>('weapons');

  setSection(section: ManageSection) {
    this.activeSection.set(section);
  }
}
