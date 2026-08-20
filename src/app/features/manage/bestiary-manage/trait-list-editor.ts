import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TraitBlock } from '../../../core/bestiary-store';

// Usato 7 volte identiche dentro monster-form.html (Tratti Speciali, Azioni, Azioni
// Bonus, Reazioni, Azioni Leggendarie, Azioni di Tana, Effetti Regionali): tutti
// condividono la stessa forma "lista di {name, description}" con add/remove riga, quindi
// qui l'astrazione toglie duplicazione invece di aggiungerne.
@Component({
  selector: 'app-trait-list-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './trait-list-editor.html',
})
export class TraitListEditor {
  @Input() items: TraitBlock[] = [];
  @Output() itemsChange = new EventEmitter<TraitBlock[]>();
  @Input() addLabel = '';

  addItem() {
    this.itemsChange.emit([...this.items, { name: '', description: '' }]);
  }

  removeItem(index: number) {
    this.itemsChange.emit(this.items.filter((_, i) => i !== index));
  }

  updateName(index: number, name: string) {
    this.itemsChange.emit(this.items.map((item, i) => (i === index ? { ...item, name } : item)));
  }

  updateDescription(index: number, description: string) {
    this.itemsChange.emit(
      this.items.map((item, i) => (i === index ? { ...item, description } : item))
    );
  }
}
