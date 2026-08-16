import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

@Component({
  selector: 'app-subclass-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './subclass-create.html',
})
export class SubclassCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected classes = this.contentStore.getContent('classes');
  protected subclasses = this.contentStore.getContent('subclasses');

  name = '';
  classId = '';
  unlockedAtLevel = 3;
  description = '';

  editingId: string | null = null;

  loading = signal(false);

  private async refreshSubclasses() {
    await this.contentStore.refresh('subclasses');
  }

  private resetForm() {
    this.editingId = null;
    this.name = '';
    this.classId = '';
    this.unlockedAtLevel = 3;
    this.description = '';
  }

  // Nome della classe genitrice, per mostrarlo nella lista del catalogo.
  className(sub: any): string {
    const cls = this.classes().find((c: any) => c.id === sub.raw.class_id);
    return cls?.name ?? '—';
  }

  startEdit(sub: any) {
    this.editingId = sub.id;
    this.name = sub.raw.name;
    this.classId = sub.raw.class_id;
    this.unlockedAtLevel = sub.raw.unlocked_at_level ?? 3;
    this.description = sub.description ?? '';
  }

  cancelEdit() {
    this.resetForm();
  }

  async submit() {
    this.loading.set(true);

    const payload = {
      name: this.name,
      class_id: this.classId,
      unlocked_at_level: this.unlockedAtLevel,
      description: this.description || null,
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('subclasses').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('subclasses').insert(payload);

    if (error) {
      this.modal.error(error.message);
    } else {
      this.resetForm();
      await this.refreshSubclasses();
      !this.editingId
      ? this.modal.success(this.localeService.t('well_subclasses_created'))
      : this.modal.success(this.localeService.t('well_subclasses_updated'))
    }

    this.loading.set(false);
  }

  async deleteSubclass(id: string, name: string) {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_subclass')} "${name}"?`,
      {
       cancelLabel: this.localeService.t('cancel_button'),
       confirmLabel: this.localeService.t('confirm_delete_subclass_title')
      }
    );
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('subclasses').delete().eq('id', id);
    if (error) {
      this.modal.error(error.message);
    } else {
      let confirmed = await this.modal.success(
        `${this.localeService.t('subclass_deleted_msg_1')} "${name}" ${this.localeService.t('subclass_deleted_msg_2')}`
      );
      if(!confirmed) return;
      await this.refreshSubclasses();
    }
  }
}
