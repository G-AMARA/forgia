import { Injectable, signal } from '@angular/core';
import { LocaleService } from './locale';

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
  constructor(private localeService: LocaleService) {}
  [x: string]: any;
  readonly state = signal<UtilityModalState | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  confirm(
    message: string,
    options?:{
      title?: string,
      confirmLabel?: string,
      cancelLabel?: string
    }
  ): Promise<boolean> {
    this.resolver?.(false);

    this.state.set({
      title: options?.title ?? this.localeService.t('generic_modal_alert_title'),
      modalMessage: message,
      imageSrc: 'modal-png/allert-goblin.png',
      imageAlt: this.localeService.t('generic_modal_error_alt_img'),
      variant: 'confirm',
      confirmLabel: options?.confirmLabel ?? this.localeService.t('confirmLabel') ,
      cancelLabel: options?.cancelLabel ?? this.localeService.t('cancelLabel'),
      showCancelButton: true,
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  error(message: string, title = this.localeService.t('generic_modal_error_title')): Promise<boolean> {
    this.resolver?.(false);
    this.resolver = null;

    this.state.set({
      title: title ?? this.localeService.t('generic_modal_error_title'),
      imageSrc: 'modal-png/error-goblin.png',
      imageAlt: this.localeService.t('generic_modal_error_alt_img'),
      modalMessage: message,
      variant: 'error',
      confirmLabel:  this.localeService.t('confirmLabel'),
      cancelLabel: this.localeService.t('cancelLabel'),
      showCancelButton: false,
    });
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  success(message: string, title = this.localeService.t('generic_modal_success_title')): Promise<boolean> {
    this.resolver?.(false);
    this.resolver = null;

    this.state.set({
      title: title ?? this.localeService.t('generic_modal_success_title'),
      imageSrc: 'modal-png/success-goblin.png',
      imageAlt: this.localeService.t('generic_modal_success_alt_img'),
      modalMessage: message,
      variant: 'success',
      confirmLabel: this.localeService.t('confirmLabel'),
      cancelLabel: this.localeService.t('cancelLabel'),
      showCancelButton: false,
    });
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
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