import { Injectable, signal } from '@angular/core';

type ModalKind = 'confirm' | 'error' | 'success';

interface ModalState {
  kind: ModalKind;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

// Sostituisce window.confirm() e i messaggi di errore/successo sparsi inline nei
// template: un'unica modale globale (montata in app.html), pilotata da questo
// signal. confirm() resta in sospeso finché l'utente non risponde da AppModal.
@Injectable({ providedIn: 'root' })
export class Modal {
  readonly state = signal<ModalState | null>(null);

  private resolver: ((value: boolean) => void) | null = null;

  confirm(
    message: string,
    options?: { title?: string; confirmLabel?: string; cancelLabel?: string }
  ): Promise<boolean> {
    this.resolver?.(false); // una eventuale conferma già in sospeso viene annullata
    this.state.set({
      kind: 'confirm',
      title: options?.title ?? 'Conferma',
      message,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
    });
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  error(message: string, title = 'Errore') {
    this.resolver?.(false);
    this.resolver = null;
    this.state.set({ kind: 'error', title, message });
  }

  success(message: string, title = 'Fatto') {
    this.resolver?.(false);
    this.resolver = null;
    this.state.set({ kind: 'success', title, message });
  }

  respond(result: boolean) {
    this.resolver?.(result);
    this.resolver = null;
    this.state.set(null);
  }

  // Chiudere senza scegliere (click fuori, es.) equivale sempre ad annullare, mai a confermare.
  dismiss() {
    this.respond(false);
  }
}
