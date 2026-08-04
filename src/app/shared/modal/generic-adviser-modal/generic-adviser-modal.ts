import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-generic-modal',
  standalone: true,
  imports: [], 
  templateUrl: './generic-adviser-modal.html'
})
export class GenericModalComponent {
  isOpen = input<boolean>(false);
  modalTitle = input<string>('');
  content = input<string>('');
  closeModal = output<void>();

  onClose() {
    this.closeModal.emit();
  }
}