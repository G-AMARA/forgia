import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

// Cavalcature e veicoli restano righe della tabella equipment (type = 'Mounts and
// Vehicles'), come armature e scudi: qui c'è solo un form/catalogo dedicato, stesso
// pattern di armor-create.ts (immagine "in stile carta da gioco", niente Dotazioni/tool
// category), separato da Gestione > Equipaggiamento per non affollarlo.
@Component({
  selector: 'app-mount-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mount-create.html',
})
export class MountCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  // is_mount_or_vehicle distingue le vere cavalcature/veicoli dagli accessori che
  // condividono lo stesso type SRD (bardature, selle, bisacce da sella, morso e briglia,
  // stallaggio): quelli restano equipaggiamento generico, gestibile solo da
  // Gestione > Equipaggiamento (vedi equipment-create.ts).
  private allEquipment = this.contentStore.getContent('equipment');
  protected mounts = computed(() =>
    this.allEquipment().filter(
      (e: any) => e.raw.type === 'Mounts and Vehicles' && e.raw.is_mount_or_vehicle === true
    )
  );

  listSearchTerm = signal('');
  protected filteredMounts = computed(() => {
    const term = this.listSearchTerm().trim().toLowerCase();
    return term ? this.mounts().filter((m: any) => m.name.toLowerCase().includes(term)) : this.mounts();
  });

  name = '';
  description = '';
  weight: number | null = null;
  costValue: number | null = null;
  costUnit: 'cp' | 'sp' | 'ep' | 'gp' | 'pp' = 'gp';
  carryingCapacity = '';
  imageUrl: string | null = null;

  editingId: string | null = null;
  private editingSourcebookCode: string | null = null;

  loading = signal(false);
  imageUploading = signal(false);

  private async refreshEquipment() {
    await this.contentStore.refresh('equipment');
  }

  private resetForm() {
    this.editingId = null;
    this.editingSourcebookCode = null;
    this.name = '';
    this.description = '';
    this.weight = null;
    this.costValue = null;
    this.costUnit = 'gp';
    this.carryingCapacity = '';
    this.imageUrl = null;
  }

  startEdit(item: any) {
    this.editingId = item.id;
    this.editingSourcebookCode = item.raw.sourcebook_code;
    const isEnglish = this.localeService.locale() === 'en';
    this.name = isEnglish ? item.raw.name : item.name;
    this.description = isEnglish ? (item.raw.description ?? '') : (item.description ?? '');
    this.weight = item.raw.weight ?? null;
    this.costValue = item.raw.cost_value ?? null;
    this.costUnit = item.raw.cost_unit ?? 'gp';
    this.carryingCapacity = item.raw.carrying_capacity ?? '';
    this.imageUrl = item.raw.image_url ?? null;
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
    this.loading.set(true);

    const basePayload = {
      weight: this.weight,
      cost_value: this.costValue,
      cost_unit: this.costUnit,
      carrying_capacity: this.carryingCapacity || null,
      type: 'Mounts and Vehicles',
      is_mount_or_vehicle: true,
      image_url: this.imageUrl,
      sourcebook_code: this.editingId ? (this.editingSourcebookCode ?? 'homebrew') : 'homebrew',
    };

    const locale = this.localeService.locale();
    let error: { message: string } | null = null;

    if (this.editingId && locale !== 'en') {
      // Si sta modificando una cavalcatura/veicolo esistente in una lingua diversa
      // dall'inglese: nome/descrizione vanno nella traduzione, mai sulla riga canonica
      // (stesso pattern di equipment-create.ts/armor-create.ts).
      const { error: baseError } = await this.supabase.client
        .from('equipment')
        .update(basePayload)
        .eq('id', this.editingId);

      const { error: translationError } = baseError
        ? { error: baseError }
        : await this.supabase.client.from('content_translations').upsert(
            {
              content_table: 'equipment',
              content_id: this.editingId,
              locale,
              name: this.name,
              description: this.description || null,
            },
            { onConflict: 'content_table,content_id,locale' }
          );

      error = baseError ?? translationError;
    } else {
      const payload = { ...basePayload, name: this.name, description: this.description || null };

      if (this.editingId) {
        const { error: updateError } = await this.supabase.client
          .from('equipment')
          .update(payload)
          .eq('id', this.editingId);
        error = updateError;
      } else {
        const { error: insertError } = await this.supabase.client.from('equipment').insert(payload);
        error = insertError;
      }
    }

    if (error) {
      this.modal.error(error.message);
    } else {
      this.resetForm();
      await this.refreshEquipment();
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  async deleteMount(id: string, name: string) {
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_delete_mount')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('equipment').delete().eq('id', id);
    if (error) {
      this.modal.error(error.message);
    } else {
      await this.supabase.client
        .from('content_translations')
        .delete()
        .eq('content_table', 'equipment')
        .eq('content_id', id);
      await this.refreshEquipment();
    }
  }
}
