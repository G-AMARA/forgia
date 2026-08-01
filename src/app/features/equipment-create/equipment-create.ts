import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';

interface HomebrewEquipment {
  id: string;
  name: string;
  weight: number | null;
}

@Component({
  selector: 'app-equipment-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './equipment-create.html',
})
export class EquipmentCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  protected homebrewEquipment = signal<HomebrewEquipment[]>([]);

  name = '';
  weight: number | null = null;

  editingId: string | null = null;

  errorMsg = signal<string | null>(null);
  loading = signal(false);

  constructor() {
    this.loadHomebrewEquipment();
  }

  private async loadHomebrewEquipment() {
    const { data } = await this.supabase.client
      .from('equipment')
      .select('id, name, weight')
      .eq('sourcebook_code', 'homebrew')
      .order('name');
    this.homebrewEquipment.set(data ?? []);
  }

  private resetForm() {
    this.editingId = null;
    this.name = '';
    this.weight = null;
  }

  startEdit(item: HomebrewEquipment) {
    this.editingId = item.id;
    this.name = item.name;
    this.weight = item.weight;
  }

  cancelEdit() {
    this.resetForm();
  }

  async submit() {
    this.errorMsg.set(null);
    this.loading.set(true);

    const payload = {
      name: this.name,
      weight: this.weight,
      type: 'Adventuring Gear',
      sourcebook_code: 'homebrew',
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('equipment').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('equipment').insert(payload);

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.resetForm();
      this.contentStore.invalidate('equipment');
      await this.loadHomebrewEquipment();
    }

    this.loading.set(false);
  }

  async deleteEquipment(id: string, name: string) {
    const confirmed = window.confirm(`${this.localeService.t('confirm_delete_equipment')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('equipment').delete().eq('id', id);
    if (!error) {
      this.contentStore.invalidate('equipment');
      await this.loadHomebrewEquipment();
    }
  }
}
