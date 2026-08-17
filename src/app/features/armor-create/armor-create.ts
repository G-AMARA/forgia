import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

// Le armature restano righe della tabella equipment (type = 'Armor'), come prima: qui c'è
// solo un form/catalogo dedicato, più semplice di equipment-create (niente Dotazioni/tool
// category) e con un'immagine "in stile carta da gioco" più grande dei 100x100 standard.
@Component({
  selector: 'app-armor-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './armor-create.html',
})
export class ArmorCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  // Stessa fonte del catalogo equipaggiamento, filtrata alle sole armature indossabili:
  // niente tabella dedicata, l'armatura è sempre equipment con type = 'Armor'. Gli scudi
  // sono anch'essi type = 'Armor' (dato SRD) ma restano gestibili da Gestione > Equipaggiamento,
  // non da qui: categoria 'shield' esclusa.
  private allEquipment = this.contentStore.getContent('equipment');
  protected armors = computed(() =>
    this.allEquipment().filter((e: any) => e.raw.type === 'Armor' && e.raw.armor_category !== 'shield')
  );

  listSearchTerm = signal('');
  protected filteredArmors = computed(() => {
    const term = this.listSearchTerm().trim().toLowerCase();
    return term ? this.armors().filter((a: any) => a.name.toLowerCase().includes(term)) : this.armors();
  });

  name = '';
  description = '';
  weight: number | null = null;
  armorClass: number | null = null;
  armorCategory: '' | 'light' | 'medium' | 'heavy' = '';
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
    this.armorClass = null;
    this.armorCategory = '';
    this.imageUrl = null;
  }

  startEdit(item: any) {
    this.editingId = item.id;
    this.editingSourcebookCode = item.raw.sourcebook_code;
    const isEnglish = this.localeService.locale() === 'en';
    this.name = isEnglish ? item.raw.name : item.name;
    this.description = isEnglish ? (item.raw.description ?? '') : (item.description ?? '');
    this.weight = item.raw.weight ?? null;
    this.armorClass = item.raw.armor_class ?? null;
    this.armorCategory = item.raw.armor_category ?? '';
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
      type: 'Armor',
      armor_class: this.armorClass,
      armor_category: this.armorCategory || null,
      image_url: this.imageUrl,
      sourcebook_code: this.editingId ? (this.editingSourcebookCode ?? 'homebrew') : 'homebrew',
    };

    const locale = this.localeService.locale();
    let error: { message: string } | null = null;

    if (this.editingId && locale !== 'en') {
      // Si sta modificando un'armatura esistente in una lingua diversa dall'inglese:
      // nome/descrizione vanno nella traduzione, mai sulla riga canonica (stesso
      // pattern di equipment-create.ts).
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

  async deleteArmor(id: string, name: string) {
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_delete_armor')} "${name}"?`);
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
