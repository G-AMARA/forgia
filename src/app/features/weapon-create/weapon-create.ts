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

  editingId: string | null = null;

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

  private async refreshWeapons() {
    await this.contentStore.refresh('weapons');
  }

  private resetForm() {
    this.editingId = null;
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
  }

  startEdit(weapon: any) {
    this.editingId = weapon.id;
    this.name = weapon.raw.name;
    this.damageDice = weapon.raw.damage_dice ?? '';
    this.damageType = weapon.raw.damage_type ?? '';
    this.versatileDamage = weapon.raw.versatile_damage ?? '';
    this.rangeCategory = weapon.raw.range_category ?? 'melee';
    this.normalRange = weapon.raw.normal_range ?? null;
    this.longRange = weapon.raw.long_range ?? null;
    this.weight = weapon.raw.weight ?? null;
    this.properties = weapon.raw.properties ?? '';
    this.suggestedAttackAbilities = new Set(weapon.raw.suggested_attack_ability ?? ['str']);
  }

  cancelEdit() {
    this.resetForm();
  }

  async submit() {
    if (this.suggestedAttackAbilities.size === 0) {
      this.errorMsg.set(this.localeService.t('weapon_attack_ability_required'));
      return;
    }

    this.errorMsg.set(null);
    this.loading.set(true);

    const payload = {
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
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('weapons').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('weapons').insert(payload);

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.resetForm();
      await this.refreshWeapons();
    }

    this.loading.set(false);
  }

  attackAbilityNames(abilities: string[]): string {
    return abilities.map((a) => this.localeService.t('ability_' + a)).join(' ' + this.localeService.t('or_label') + ' ');
  }

  async deleteWeapon(id: string, name: string) {
    const confirmed = window.confirm(`${this.localeService.t('confirm_delete_weapon')} "${name}"?`);
    if (!confirmed) return;

    this.errorMsg.set(null);

    const { data, error } = await this.supabase.client.from('weapons').delete().eq('id', id).select();

    if (error) {
      // 23503 = foreign_key_violation: l'arma è ancora referenziata da character_weapons
      // (personaggio che la possiede). Messaggio comprensibile invece del testo Postgres grezzo.
      this.errorMsg.set(
        error.code === '23503' ? this.localeService.t('weapon_delete_in_use_error') : error.message
      );
      return;
    }

    // Se l'RLS blocca la delete, Postgres non restituisce un errore: elimina zero righe
    // in silenzio (stesso caso già visto in CharacterStore.updateIdentity). Senza questo
    // controllo l'arma sembra non essere mai stata eliminata, senza alcun feedback.
    if (!data || data.length === 0) {
      this.errorMsg.set('Eliminazione bloccata dai permessi (nessuna riga modificata).');
      return;
    }

    await this.refreshWeapons();
  }
}
