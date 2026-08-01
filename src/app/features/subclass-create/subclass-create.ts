import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';

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

  protected classes = this.contentStore.getContent('classes');
  protected subclasses = this.contentStore.getContent('subclasses');

  name = '';
  classId = '';
  unlockedAtLevel = 3;
  description = '';

  editingId: string | null = null;

  errorMsg = signal<string | null>(null);
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
    this.errorMsg.set(null);
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
      this.errorMsg.set(error.message);
    } else {
      this.resetForm();
      await this.refreshSubclasses();
    }

    this.loading.set(false);
  }

  async deleteSubclass(id: string, name: string) {
    const confirmed = window.confirm(`${this.localeService.t('confirm_delete_subclass')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('subclasses').delete().eq('id', id);
    if (!error) {
      await this.refreshSubclasses();
    }
  }
}
