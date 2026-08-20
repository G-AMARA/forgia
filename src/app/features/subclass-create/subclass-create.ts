import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { TraitBlock } from '../../core/bestiary-store';
import { TraitListEditor } from '../manage/bestiary-manage/trait-list-editor';

@Component({
  selector: 'app-subclass-create',
  standalone: true,
  imports: [FormsModule, TraitListEditor],
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
  traits: TraitBlock[] = [];

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
    this.traits = [];
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
    this.traits = structuredClone(sub.raw.traits ?? []);
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
      traits: this.traits,
    };

    const { error } = this.editingId
      ? await this.supabase.client.from('subclasses').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('subclasses').insert(payload);

    if (error) {
      this.modal.error(error.message);
    } else {
      // Senza questo, una vecchia traduzione salvata (content_translations) continuerebbe
      // a "vincere" sul nome appena modificato qui, mostrando per sempre quello vecchio
      // (il bug segnalato: "Il Profondo" salvato ma "Il Demone" ancora mostrato ovunque).
      if (this.editingId) {
        await this.contentStore.clearTranslation('subclasses', this.editingId);
      }
      this.resetForm();
      await this.refreshSubclasses();
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  async deleteSubclass(id: string, name: string) {
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_delete_subclass')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('subclasses').delete().eq('id', id);
    if (error) {
      this.modal.error(error.message);
    } else {
      await this.refreshSubclasses();
    }
  }
}
