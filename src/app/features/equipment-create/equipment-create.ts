import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

interface EquipmentContent {
  childId: string;
  quantity: number;
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
  private modal = inject(Modal);

  // Come per weapons/spells: stessa fonte del catalogo, nome/descrizione già
  // tradotti nella lingua corrente via content_translations.
  protected equipment = this.contentStore.getContent('equipment');
  // Le armature indossabili hanno un catalogo dedicato (Gestione > Armature, vedi
  // armor-create.ts) e le cavalcature/veicoli vere e proprie pure (Gestione > Cavalcature
  // e Veicoli, vedi mount-create.ts, is_mount_or_vehicle = true): niente doppione qui, né
  // in lista né come tipo selezionabile. Gli scudi restano invece qui: sono anch'essi
  // type = 'Armor' (dato SRD) ma concettualmente sono equipaggiamento generico, non
  // "armatura indossata" in senso stretto. Stesso discorso per gli accessori da
  // cavalcatura (bardature, selle, bisacce, morso e briglia, stallaggio): condividono il
  // type SRD 'Mounts and Vehicles' ma is_mount_or_vehicle resta false, quindi restano
  // equipaggiamento generico gestito qui.
  private nonArmorEquipment = computed(() =>
    this.equipment().filter(
      (e: any) =>
        (e.raw.type !== 'Armor' || e.raw.armor_category === 'shield') &&
        !(e.raw.type === 'Mounts and Vehicles' && e.raw.is_mount_or_vehicle === true)
    )
  );

  private static readonly TYPE_KEYS: Record<string, string> = {
    'Adventuring Gear': 'equipment_type_adventuring_gear',
    'Armor': 'equipment_type_shield',
    'Mounts and Vehicles': 'equipment_type_mounts_and_vehicles',
    'Tools': 'equipment_type_tools',
    'Pack': 'equipment_type_pack',
  };

  typeLabel(type: string): string {
    const key = EquipmentCreate.TYPE_KEYS[type];
    return key ? this.localeService.t(key) : type;
  }

  listSearchTerm = signal('');
  protected filteredEquipment = computed(() => {
    const term = this.listSearchTerm().trim().toLowerCase();
    const source = this.nonArmorEquipment();
    return term ? source.filter((e: any) => e.name.toLowerCase().includes(term)) : source;
  });

  name = '';
  description = '';
  weight: number | null = null;
  costValue: number | null = null;
  costUnit: 'cp' | 'sp' | 'ep' | 'gp' | 'pp' = 'gp';
  imageUrl: string | null = null;
  type: 'Adventuring Gear' | 'Armor' | 'Mounts and Vehicles' | 'Tools' | 'Pack' = 'Adventuring Gear';
  toolCategory: '' | 'artisan_tools' | 'musical_instrument' = '';

  editingId: string | null = null;
  // sourcebook_code dell'elemento in modifica: preservato al salvataggio così
  // modificare un elemento SRD non lo "adotta" silenziosamente come homebrew.
  private editingSourcebookCode: string | null = null;

  loading = signal(false);
  imageUploading = signal(false);

  // Relazione padre/figli (equipment_contents): mappa parent_id -> figli con quantità,
  // caricata a parte perché non fa parte della riga equipment (tabella di giunzione).
  private contentsByParent = signal<Map<string, EquipmentContent[]>>(new Map());
  selectedContents: EquipmentContent[] = [];
  contentToAddId = '';
  contentToAddQuantity = 1;

  constructor() {
    this.loadContents();
  }

  private async loadContents() {
    const { data } = await this.supabase.client
      .from('equipment_contents')
      .select('parent_equipment_id, child_equipment_id, quantity');

    const map = new Map<string, EquipmentContent[]>();
    for (const row of data ?? []) {
      const list = map.get(row.parent_equipment_id) ?? [];
      list.push({ childId: row.child_equipment_id, quantity: row.quantity });
      map.set(row.parent_equipment_id, list);
    }
    this.contentsByParent.set(map);
  }

  // Oggetti selezionabili come contenuto: esclude sé stesso (in modifica) e quelli già aggiunti.
  availableContentOptions(): any[] {
    const alreadyAdded = new Set(this.selectedContents.map((c) => c.childId));
    return this.equipment().filter((e: any) => e.id !== this.editingId && !alreadyAdded.has(e.id));
  }

  addContent() {
    if (!this.contentToAddId) return;
    const quantity = Math.max(1, Math.floor(this.contentToAddQuantity) || 1);
    this.selectedContents = [...this.selectedContents, { childId: this.contentToAddId, quantity }];
    this.contentToAddId = '';
    this.contentToAddQuantity = 1;
  }

  removeContent(childId: string) {
    this.selectedContents = this.selectedContents.filter((c) => c.childId !== childId);
  }

  contentName(childId: string): string {
    return this.equipment().find((e: any) => e.id === childId)?.name ?? '';
  }

  // Riepilogo "Contiene: ..." mostrato in lista sotto ogni oggetto padre.
  contentsSummary(parentId: string): string {
    const contents = this.contentsByParent().get(parentId) ?? [];
    return contents.map((c) => `${c.quantity}× ${this.contentName(c.childId)}`).join(', ');
  }

  // Riepilogo inverso "Contenuto in: ..." per chi vuole capire dove finisce un oggetto.
  containedInSummary(childId: string): string {
    const parents: string[] = [];
    for (const [parentId, contents] of this.contentsByParent()) {
      if (contents.some((c) => c.childId === childId)) {
        parents.push(this.contentName(parentId));
      }
    }
    return parents.join(', ');
  }

  private resetForm() {
    this.editingId = null;
    this.editingSourcebookCode = null;
    this.name = '';
    this.description = '';
    this.weight = null;
    this.costValue = null;
    this.costUnit = 'gp';
    this.imageUrl = null;
    this.type = 'Adventuring Gear';
    this.toolCategory = '';
    this.selectedContents = [];
    this.contentToAddId = '';
    this.contentToAddQuantity = 1;
  }

  startEdit(item: any) {
    this.editingId = item.id;
    this.editingSourcebookCode = item.raw.sourcebook_code;
    // In inglese si modifica il dato canonico. Nelle altre lingue si modifica invece
    // la traduzione mostrata in lista (submit() la salva su content_translations,
    // senza toccare la riga base): così l'admin corregge esattamente quello che vede.
    const isEnglish = this.localeService.locale() === 'en';
    this.name = isEnglish ? item.raw.name : item.name;
    this.description = isEnglish ? (item.raw.description ?? '') : (item.description ?? '');
    this.weight = item.raw.weight ?? null;
    this.costValue = item.raw.cost_value ?? null;
    this.costUnit = item.raw.cost_unit ?? 'gp';
    this.imageUrl = item.raw.image_url ?? null;
    this.type = item.raw.type ?? 'Adventuring Gear';
    this.toolCategory = item.raw.tool_category ?? '';
    this.selectedContents = [...(this.contentsByParent().get(item.id) ?? [])];
  }

  cancelEdit() {
    this.resetForm();
  }

  // Ridimensiona lato client se l'immagine supera 100x100 (etichetta del campo upload).
  // L'anteprima e la lista mostrano sempre un riquadro quadrato con object-cover: qui si
  // riproduce lo stesso ritaglio "cover" centrato, altrimenti un semplice fit-in-bounds
  // produce un rettangolo non quadrato che poi l'object-cover deve ri-tagliare/allungare
  // partendo da un'immagine già rimpicciolita, risultando sgranato.
  private async resizeImageIfNeeded(file: File, size = 100): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width <= size && bitmap.height <= size) {
      bitmap.close();
      return file;
    }

    const scale = Math.max(size / bitmap.width, size / bitmap.height);
    const scaledWidth = bitmap.width * scale;
    const scaledHeight = bitmap.height * scale;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas
      .getContext('2d')!
      .drawImage(bitmap, (size - scaledWidth) / 2, (size - scaledHeight) / 2, scaledWidth, scaledHeight);
    bitmap.close();

    const mimeType = file.type || 'image/png';
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas toBlob failed'))), mimeType, 0.92);
    });
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imageUploading.set(true);

    const resized = await this.resizeImageIfNeeded(file);
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await this.supabase.client.storage
      .from('content-images')
      .upload(path, resized, { upsert: true });

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

  // Sostituisce l'intero set di contenuti del padre con quello attuale del form:
  // più semplice e robusto di un diff incrementale, il volume di righe è minimo.
  private async syncContents(parentId: string): Promise<{ message: string } | null> {
    const { error: deleteError } = await this.supabase.client
      .from('equipment_contents')
      .delete()
      .eq('parent_equipment_id', parentId);
    if (deleteError) return deleteError;

    if (this.selectedContents.length === 0) return null;

    const rows = this.selectedContents.map((c) => ({
      parent_equipment_id: parentId,
      child_equipment_id: c.childId,
      quantity: c.quantity,
    }));
    const { error: insertError } = await this.supabase.client.from('equipment_contents').insert(rows);
    return insertError;
  }

  async submit() {
    this.loading.set(true);

    // Campi senza traduzione separata: valgono per tutte le lingue, vanno sempre
    // sulla riga base a prescindere dalla lingua corrente.
    const basePayload = {
      weight: this.weight,
      cost_value: this.costValue,
      cost_unit: this.costUnit,
      type: this.type,
      tool_category: this.type === 'Tools' ? this.toolCategory || null : null,
      // "Scudo" nel select equivale a type Armor: qui l'unica armatura gestibile è lo
      // scudo (armor_category fissa), le altre armature si gestiscono da Gestione > Armature.
      armor_category: this.type === 'Armor' ? 'shield' : null,
      image_url: this.imageUrl,
      sourcebook_code: this.editingId ? (this.editingSourcebookCode ?? 'homebrew') : 'homebrew',
    };

    const locale = this.localeService.locale();
    let targetId = this.editingId;
    let error: { message: string } | null = null;

    if (this.editingId && locale !== 'en') {
      // Si sta modificando un elemento esistente in una lingua diversa dall'inglese:
      // nome/descrizione vanno nella traduzione, mai sulla riga canonica.
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
      // Creazione di un nuovo homebrew, oppure modifica mentre si è in inglese:
      // nome e descrizione vanno direttamente sulla riga canonica, come prima.
      const payload = { ...basePayload, name: this.name, description: this.description || null };

      if (this.editingId) {
        const { error: updateError } = await this.supabase.client
          .from('equipment')
          .update(payload)
          .eq('id', this.editingId);
        error = updateError;
      } else {
        const { data, error: insertError } = await this.supabase.client
          .from('equipment')
          .insert(payload)
          .select()
          .single();
        error = insertError;
        targetId = data?.id ?? null;
      }
    }

    if (!error && targetId) {
      error = await this.syncContents(targetId);
    }

    if (error) {
      this.modal.error(error.message);
    } else {
      this.resetForm();
      await this.contentStore.refresh('equipment');
      await this.loadContents();
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  async deleteEquipment(id: string, name: string) {
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_delete_equipment')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('equipment').delete().eq('id', id);
    if (error) {
      this.modal.error(error.message);
    } else {
      // Ripulisce eventuali traduzioni orfane rimaste agganciate a questo elemento.
      // equipment_contents si ripulisce da sé (ON DELETE CASCADE sulla FK).
      await this.supabase.client
        .from('content_translations')
        .delete()
        .eq('content_table', 'equipment')
        .eq('content_id', id);
      await this.contentStore.refresh('equipment');
      await this.loadContents();
    }
  }
}
