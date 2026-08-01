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
  suggestedAttackAbilities = new Set<string>(['str']);

  errorMsg = signal<string | null>(null);
  loading = signal(false);

  toggleAttackAbility(key: string) {
    const current = new Set(this.suggestedAttackAbilities);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.suggestedAttackAbilities = current;
  }

  isAttackAbilitySelected(key: string): boolean {
    return this.suggestedAttackAbilities.has(key);
  }

  private refreshWeapons() {
    this.contentStore.invalidate('weapons');
    this.weapons = this.contentStore.getContent('weapons');
  }

  async submit() {
    if (this.suggestedAttackAbilities.size === 0) {
      this.errorMsg.set(this.localeService.t('weapon_attack_ability_required'));
      return;
    }

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
      suggested_attack_ability: Array.from(this.suggestedAttackAbilities),
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
      this.suggestedAttackAbilities = new Set(['str']);
      this.refreshWeapons();
    }

    this.loading.set(false);
  }

  attackAbilityNames(abilities: string[]): string {
    return abilities.map((a) => this.localeService.t('ability_' + a)).join(' ' + this.localeService.t('or_label') + ' ');
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
