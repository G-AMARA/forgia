import { Component, HostListener, input, output } from '@angular/core';

// Modale "solo immagine": ingrandisce la foto dell'arma mostrata nel riquadro del form
// di creazione/modifica. Nessuno stato interno, solo apri/chiudi delegato al padre.
@Component({
  selector: 'app-weapon-image-preview-modal',
  standalone: true,
  templateUrl: './weapon-image-preview-modal.html',
})
export class WeaponImagePreviewModal {
  readonly imageUrl = input.required<string>();
  readonly name = input('');

  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape() {
    this.closed.emit();
  }
}
