import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

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
  private modal = inject(Modal);

  protected weapons = this.contentStore.getContent('weapons');

  listSearchTerm = signal('');
  protected filteredWeapons = computed(() => {
    const term = this.listSearchTerm().trim().toLowerCase();
    return term ? this.weapons().filter((w: any) => w.name.toLowerCase().includes(term)) : this.weapons();
  });

  name = '';
  damageDice = '';
  damageType = '';
  versatileDamage = '';
  rangeCategory: 'melee' | 'ranged' = 'melee';
  weaponCategory: 'simple' | 'martial' | '' = '';
  normalRange: number | null = null;
  longRange: number | null = null;
  weight: number | null = null;
  costValue: number | null = null;
  costUnit: 'cp' | 'sp' | 'ep' | 'gp' | 'pp' = 'gp';
  properties = '';
  suggestedAttackAbilities = new Set<string>(['str']);
  imageUrl: string | null = null;

  editingId: string | null = null;
  // sourcebook_code dell'arma in modifica: preservato al salvataggio così
  // modificare un'arma SRD non la "adotta" silenziosamente come homebrew.
  private editingSourcebookCode: string | null = null;

  loading = signal(false);
  imageUploading = signal(false);

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
    this.editingSourcebookCode = null;
    this.name = '';
    this.damageDice = '';
    this.damageType = '';
    this.versatileDamage = '';
    this.rangeCategory = 'melee';
    this.weaponCategory = '';
    this.normalRange = null;
    this.longRange = null;
    this.weight = null;
    this.costValue = null;
    this.costUnit = 'gp';
    this.properties = '';
    this.suggestedAttackAbilities = new Set(['str']);
    this.imageUrl = null;
  }

  startEdit(weapon: any) {
    this.editingId = weapon.id;
    this.editingSourcebookCode = weapon.raw.sourcebook_code;
    // In inglese si modifica il dato canonico. Nelle altre lingue si modifica invece
    // la traduzione mostrata in lista (submit() la salva su content_translations,
    // senza toccare la riga base): così l'admin corregge esattamente quello che vede.
    const isEnglish = this.localeService.locale() === 'en';
    this.name = isEnglish ? weapon.raw.name : weapon.name;
    this.damageDice = weapon.raw.damage_dice ?? '';
    this.damageType = weapon.raw.damage_type ?? '';
    this.versatileDamage = weapon.raw.versatile_damage ?? '';
    this.rangeCategory = weapon.raw.range_category ?? 'melee';
    this.weaponCategory = weapon.raw.weapon_category ?? '';
    this.normalRange = weapon.raw.normal_range ?? null;
    this.longRange = weapon.raw.long_range ?? null;
    this.weight = weapon.raw.weight ?? null;
    this.costValue = weapon.raw.cost_value ?? null;
    this.costUnit = weapon.raw.cost_unit ?? 'gp';
    this.properties = weapon.raw.properties ?? '';
    this.suggestedAttackAbilities = new Set(weapon.raw.suggested_attack_ability ?? ['str']);
    this.imageUrl = weapon.raw.image_url ?? null;
  }

  cancelEdit() {
    this.resetForm();
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imageUploading.set(true);

    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await this.supabase.client.storage
      .from('content-images')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      this.modal.error(uploadError.message);
      this.imageUploading.set(false);
      input.value = '';
      return;
    }

    const { data } = this.supabase.client.storage.from('content-images').getPublicUrl(path);
    this.imageUrl = data.publicUrl;
    this.imageUploading.set(false);
    input.value = '';
  }

  async submit() {
    if (this.suggestedAttackAbilities.size === 0) {
      this.modal.error(this.localeService.t('weapon_attack_ability_required'));
      return;
    }

    this.loading.set(true);

    // Campi senza traduzione separata: valgono per tutte le lingue, vanno sempre
    // sulla riga base a prescindere dalla lingua corrente.
    const basePayload = {
      damage_dice: this.damageDice,
      damage_type: this.damageType,
      versatile_damage: this.versatileDamage || null,
      range_category: this.rangeCategory,
      weapon_category: this.weaponCategory || null,
      normal_range: this.rangeCategory === 'ranged' ? this.normalRange : null,
      long_range: this.rangeCategory === 'ranged' ? this.longRange : null,
      weight: this.weight,
      cost_value: this.costValue,
      cost_unit: this.costUnit,
      properties: this.properties || null,
      suggested_attack_ability: Array.from(this.suggestedAttackAbilities),
      image_url: this.imageUrl,
      sourcebook_code: this.editingId ? (this.editingSourcebookCode ?? 'homebrew') : 'homebrew',
    };

    const locale = this.localeService.locale();

    if (this.editingId && locale !== 'en') {
      // Si sta modificando un'arma esistente in una lingua diversa dall'inglese:
      // nome/descrizione vanno nella traduzione, mai sulla riga canonica.
      const { error: baseError } = await this.supabase.client
        .from('weapons')
        .update(basePayload)
        .eq('id', this.editingId);

      const { error: translationError } = baseError
        ? { error: baseError }
        : await this.supabase.client.from('content_translations').upsert(
            {
              content_table: 'weapons',
              content_id: this.editingId,
              locale,
              name: this.name,
            },
            { onConflict: 'content_table,content_id,locale' }
          );

      const error = baseError ?? translationError;
      if (error) {
        this.modal.error(error.message);
      } else {
        this.resetForm();
        await this.refreshWeapons();
        this.modal.success(this.localeService.t('well_weapon_created'));
      }

      this.loading.set(false);
      return;
    }

    // Creazione di una nuova homebrew, oppure modifica mentre si è in inglese:
    // nome e descrizione vanno direttamente sulla riga canonica, come prima.
    const payload = { ...basePayload, name: this.name };

    const { error } = this.editingId
      ? await this.supabase.client.from('weapons').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('weapons').insert(payload);

    if (error) {
      this.modal.error(error.message);
    } else {
      this.resetForm();
      await this.refreshWeapons();
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  attackAbilityNames(abilities: string[]): string {
    return abilities.map((a) => this.localeService.t('ability_' + a)).join(' ' + this.localeService.t('or_label') + ' ');
  }

  async deleteWeapon(id: string, name: string) {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_weapon')} "${name}"?`, 
      {
       cancelLabel: this.localeService.t('cancel_button'), 
       confirmLabel: this.localeService.t('confirm_delete_weapon_title')
      }
    );
    if (!confirmed) return;

    const { data, error } = await this.supabase.client.from('weapons').delete().eq('id', id).select();

    if (error) {
      // 23503 = foreign_key_violation: l'arma è ancora referenziata da character_weapons
      // (personaggio che la possiede). Messaggio comprensibile invece del testo Postgres grezzo.
      this.modal.error(
        error.code === '23503' ? this.localeService.t('weapon_delete_in_use_error') : error.message
      );
      return;
    }

    // Se l'RLS blocca la delete, Postgres non restituisce un errore: elimina zero righe
    // in silenzio (stesso caso già visto in CharacterStore.updateIdentity). Senza questo
    // controllo l'arma sembra non essere mai stata eliminata, senza alcun feedback.
    if (!data || data.length === 0) {
      this.modal.error('Eliminazione bloccata dai permessi (nessuna riga modificata).');
      return;
    }

    // Ripulisce eventuali traduzioni orfane rimaste agganciate a questa arma.
    await this.supabase.client
      .from('content_translations')
      .delete()
      .eq('content_table', 'weapons')
      .eq('content_id', id);

    await this.refreshWeapons();
  }
}
