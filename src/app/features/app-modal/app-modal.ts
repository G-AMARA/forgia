import { Component, inject } from '@angular/core';
import { Modal } from '../../core/modal';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './app-modal.html',
})
export class AppModal {
  protected modal = inject(Modal);
}
