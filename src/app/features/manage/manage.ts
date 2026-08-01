import { Component, inject, signal } from '@angular/core';
import { WeaponCreate } from '../weapon-create/weapon-create';
import { SpellCreate } from '../spell-create/spell-create';
import { EquipmentCreate } from '../equipment-create/equipment-create';
import { RaceCreate } from '../race-create/race-create';
import { BackgroundCreate } from '../background-create/background-create';
import { ClassCreate } from '../class-create/class-create';
import { SubclassCreate } from '../subclass-create/subclass-create';
import { LocaleService } from '../../core/locale';

type ManageSection = 'weapons' | 'spells' | 'equipment' | 'races' | 'backgrounds' | 'classes' | 'subclasses';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [WeaponCreate, SpellCreate, EquipmentCreate, RaceCreate, BackgroundCreate, ClassCreate, SubclassCreate],
  templateUrl: './manage.html',
})
export class Manage {
  protected localeService = inject(LocaleService);

  activeSection = signal<ManageSection>('weapons');

  setSection(section: ManageSection) {
    this.activeSection.set(section);
  }
}
