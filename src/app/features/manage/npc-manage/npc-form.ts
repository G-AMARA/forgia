import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NpcAttitude, NpcCharacter, NpcStore } from '../../../core/npc-store';
import { LocaleService } from '../../../core/locale';
import { Modal } from '../../../core/modal';

@Component({
  selector: 'app-npc-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './npc-form.html',
})
export class NpcForm implements OnInit {
  private npcStore = inject(NpcStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  @Input() editingNpc: NpcCharacter | null = null;
  // Valorizzato solo quando il form è aperto dal tab PNG di una campagna (Npc component):
  // lega il PNG appena creato a quella campagna invece che lasciarlo nel solo catalogo
  // globale (vedi NpcStore.createNpc). Resta null per Gestione > PNG.
  @Input() campaignId: string | null = null;
  @Output() closed = new EventEmitter<void>();

  protected readonly attitudes: NpcAttitude[] = ['friendly', 'neutral', 'hostile'];

  private editingId: string | null = null;

  name = '';
  title = '';
  location = '';
  attitude: NpcAttitude | '' = '';
  description = '';

  imageUrl: string | null = null;
  imageUploading = signal(false);
  loading = signal(false);

  ngOnInit() {
    if (this.editingNpc) {
      this.startEdit(this.editingNpc);
    }
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imageUploading.set(true);

    const { error, url } = await this.npcStore.uploadNpcImage(file);

    if (error) {
      this.modal.error(error.message);
      this.imageUploading.set(false);
      input.value = '';
      return;
    }

    this.imageUrl = url ?? null;
    this.imageUploading.set(false);
    input.value = '';
  }

  cancel() {
    this.closed.emit();
  }

  async submit() {
    if (!this.name.trim()) {
      this.modal.error(this.localeService.t('npc_name_label'));
      return;
    }

    // Il limite vero è imposto lato RLS (get_npc_creation_limit): questo controllo evita
    // solo un errore di permessi poco chiaro se la quota si è esaurita nel frattempo
    // (es. un altro tab dello stesso utente).
    if (!this.editingId && this.campaignId && !this.npcStore.canCreateNpc()) {
      this.modal.error(this.localeService.t('npc_quota_reached_hint'));
      return;
    }

    this.loading.set(true);

    const payload = {
      name: this.name,
      title: this.title || null,
      location: this.location || null,
      attitude: this.attitude || null,
      description: this.description || null,
      image_url: this.imageUrl,
    };

    const { error } = this.editingId
      ? await this.npcStore.updateNpc(this.editingId, payload)
      : await this.npcStore.createNpc(payload, this.campaignId ?? undefined);

    this.loading.set(false);

    if (error) {
      this.modal.error(error.message);
      return;
    }

    this.modal.success(this.localeService.t(!this.editingId ? 'npc_created_msg' : 'npc_updated_msg'));
    this.closed.emit();
  }

  private startEdit(npc: NpcCharacter) {
    this.editingId = npc.id;
    this.name = npc.name;
    this.title = npc.title ?? '';
    this.location = npc.location ?? '';
    this.attitude = npc.attitude ?? '';
    this.description = npc.description ?? '';
    this.imageUrl = npc.image_url;
  }
}
