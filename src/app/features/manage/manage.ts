import { Component, inject, signal } from '@angular/core';
import { WeaponCreate } from '../weapon-create/weapon-create';
import { SpellCreate } from '../spell-create/spell-create';
import { EquipmentCreate } from '../equipment-create/equipment-create';
import { ArmorCreate } from '../armor-create/armor-create';
import { MountCreate } from '../mount-create/mount-create';
import { RaceCreate } from '../race-create/race-create';
import { SubraceCreate } from '../subrace-create/subrace-create';
import { BackgroundCreate } from '../background-create/background-create';
import { ClassCreate } from '../class-create/class-create';
import { SubclassCreate } from '../subclass-create/subclass-create';
import { BestiaryManage } from './bestiary-manage/bestiary-manage';
import { LocaleService } from '../../core/locale';

type ManageSection = 'races' | 'subraces' | 'classes' | 'subclasses' | 'backgrounds' | 'weapons' | 'spells' | 'equipment' | 'armors' | 'mounts' | 'bestiary';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [RaceCreate, SubraceCreate, ClassCreate, SubclassCreate, BackgroundCreate, WeaponCreate, SpellCreate, EquipmentCreate, ArmorCreate, MountCreate, BestiaryManage],
  templateUrl: './manage.html',
})
export class Manage {
  protected localeService = inject(LocaleService);

  activeSection = signal<ManageSection>('races');

  setSection(section: ManageSection) {
    this.activeSection.set(section);
  }
}
