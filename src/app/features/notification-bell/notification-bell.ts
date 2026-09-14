import { Component, inject } from '@angular/core';
import { AppNav } from '../../core/app-nav';
import { InboxStore } from '../../core/inbox-store';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  template: `
    <button
      type="button"
      (click)="appNav.setTab('inbox')"
      [title]="localeService.t('tab_inbox')"
      class="relative flex items-center justify-center w-9 h-9 shrink-0 text-forge-text-sub hover:text-forge-amber-glow transition-colors"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 6l10 7 10-7" />
      </svg>
      @if (inboxStore.unreadCount() > 0) {
        <span
          class="absolute -top-1 -right-1 flex items-center justify-center text-[10px] w-4 h-4 rounded-full bg-forge-amber text-forge-obsidian font-bold leading-none"
        >
          {{ inboxStore.unreadCount() }}
        </span>
      }
    </button>
  `,
})
export class NotificationBell {
  protected readonly appNav = inject(AppNav);
  protected readonly inboxStore = inject(InboxStore);
  protected readonly localeService = inject(LocaleService);
}
