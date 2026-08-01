import { Component, inject, signal } from '@angular/core';
import { WeaponCreate } from '../weapon-create/weapon-create';
import { SpellCreate } from '../spell-create/spell-create';
import { EquipmentCreate } from '../equipment-create/equipment-create';
import { RaceCreate } from '../race-create/race-create';
import { BackgroundCreate } from '../background-create/background-create';
import { ClassCreate } from '../class-create/class-create';
import { SubclassCreate } from '../subclass-create/subclass-create';
import { LocaleService } from '../../core/locale';

type ManageSection = 'races' | 'classes' | 'subclasses' | 'backgrounds' | 'weapons' | 'spells' | 'equipment';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [RaceCreate, ClassCreate, SubclassCreate, BackgroundCreate, WeaponCreate, SpellCreate, EquipmentCreate],
  templateUrl: './manage.html',
})
export class Manage {
  protected localeService = inject(LocaleService);

  activeSection = signal<ManageSection>('races');

  setSection(section: ManageSection) {
    this.activeSection.set(section);
  }
}
