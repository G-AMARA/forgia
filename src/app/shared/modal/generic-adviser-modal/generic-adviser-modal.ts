import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-generic-modal',
  standalone: true,
  imports: [], 
  templateUrl: './generic-adviser-modal.html'
})
export class GenericModalComponent {
  
  isOpen = input(false);
  title = input('');
  imageSrc = input<string | null>(null);
  imageAlt = input<string | null>(null);
  modalMessage = input('');
  confirmLabel = input('');
  cancelLabel = input('');
  variant = input<'success' | 'error' | 'warning' | 'confirm'>('confirm');
  showCancelButton = input(true);

  modalCustomHeader = input(false);
  modalCustomBody = input(false);
  modalCustomFooter = input(false);

  closeModal = output<void>();
  confirmModal = output<void>();

  getAccentClass() {
  switch (this.variant()) {
    case 'success': return 'text-emerald-400 border-emerald-500';
    case 'error': return 'text-red-400 border-red-500';
    case 'warning': return 'text-amber-400 border-amber-500';
    default: return 'text-fantasy-gold border-gold';
  }
}

  onClose() {
    this.closeModal.emit();
  }
  onConfirm() {
  this.confirmModal.emit();
}
}