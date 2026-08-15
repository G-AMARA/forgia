import { Injectable, signal } from '@angular/core';

type ModalVariant = 'confirm' | 'success' | 'error' | 'warning';

export interface UtilityModalState {
  title: string;
  modalMessage: string;
  imageSrc?: string | null;
  imageAlt?: string | null;
  variant: ModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancelButton?: boolean;
}

@Injectable({ providedIn: 'root' })
export class Modal {
  readonly state = signal<UtilityModalState | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  confirm(
    message: string,
    title: string,
    confirmLabel?: string,
    cancelLabel?: string
  ): Promise<boolean> {
    this.resolver?.(false);

    this.state.set({
      title: title,
      modalMessage: message,
      imageSrc: 'modal-png/allert-goblin.png',
      imageAlt: 'Un goblin dietro un segnale triangolare di allerta',
      variant: 'confirm',
      confirmLabel: confirmLabel,
      cancelLabel: cancelLabel,
      showCancelButton: true,
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  error(message: string, title = 'Spiacente Avventuriero!') {
    this.resolver?.(false);
    this.resolver = null;

    this.state.set({
      title,
      imageSrc: 'modal-png/error-goblin.png',
      imageAlt: 'Un goblin dietro un segnale tondo di errore',
      modalMessage: message,
      variant: 'error',
      confirmLabel: 'OK',
      cancelLabel: 'Chiudi',
      showCancelButton: false,
    });
  }

  success(message: string, title = 'Buone notizie Avventuriero!') {
    this.resolver?.(false);
    this.resolver = null;

    this.state.set({
      title,
      imageSrc: 'modal-png/success-goblin.png',
      imageAlt: 'Un goblin dietro un segnale tondo di successo',
      modalMessage: message,
      variant: 'success',
      confirmLabel: 'OK',
      cancelLabel: 'Chiudi',
      showCancelButton: false,
    });
  }

  respond(result: boolean) {
    this.resolver?.(result);
    this.resolver = null;
    this.state.set(null);
  }

  dismiss() {
    this.respond(false);
  }
}