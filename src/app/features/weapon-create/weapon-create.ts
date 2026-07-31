import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-weapon-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './weapon-create.html',
})
export class WeaponCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  protected weapons = this.contentStore.getContent('weapons');

  name = '';
  damageDice = '';
  damageType = '';
  versatileDamage = '';
  rangeCategory: 'melee' | 'ranged' = 'melee';
  normalRange: number | null = null;
  longRange: number | null = null;
  weight: number | null = null;
  properties = '';
  suggestedAttackAbility = 'str';

  errorMsg = signal<string | null>(null);
  loading = signal(false);

  private refreshWeapons() {
    this.contentStore.invalidate('weapons');
    this.weapons = this.contentStore.getContent('weapons');
  }

  async submit() {
    this.errorMsg.set(null);
    this.loading.set(true);

    const { error } = await this.supabase.client.from('weapons').insert({
      name: this.name,
      damage_dice: this.damageDice,
      damage_type: this.damageType,
      versatile_damage: this.versatileDamage || null,
      range_category: this.rangeCategory,
      normal_range: this.rangeCategory === 'ranged' ? this.normalRange : null,
      long_range: this.rangeCategory === 'ranged' ? this.longRange : null,
      weight: this.weight,
      properties: this.properties || null,
      suggested_attack_ability: this.suggestedAttackAbility,
    });

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.name = '';
      this.damageDice = '';
      this.damageType = '';
      this.versatileDamage = '';
      this.rangeCategory = 'melee';
      this.normalRange = null;
      this.longRange = null;
      this.weight = null;
      this.properties = '';
      this.suggestedAttackAbility = 'str';
      this.refreshWeapons();
    }

    this.loading.set(false);
  }

  async deleteWeapon(id: string, name: string) {
    const confirmed = window.confirm(`${this.localeService.t('confirm_delete_weapon')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('weapons').delete().eq('id', id);
    if (!error) {
      this.refreshWeapons();
    }
  }
}
