import { Component, inject, signal } from '@angular/core';
import { InboxStore, CampaignInvite } from '../../core/inbox-store';
import { LocaleService } from '../../core/locale';
import { ActiveCampaign } from '../../core/active-campaign';
import { AppNav } from '../../core/app-nav';
import { Modal } from '../../core/modal';
import { CampaignInviteCard } from './campaign-invite-card';
import { NewsCard } from './news-card';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CampaignInviteCard, NewsCard],
  templateUrl: './inbox.html',
})
export class Inbox {
  protected readonly inboxStore = inject(InboxStore);
  protected readonly localeService = inject(LocaleService);
  private readonly activeCampaign = inject(ActiveCampaign);
  private readonly appNav = inject(AppNav);
  private readonly modal = inject(Modal);

  protected readonly activeTab = signal<'invites' | 'news'>('invites');

  protected selectTab(tab: 'invites' | 'news') {
    this.activeTab.set(tab);
  }

  // Accettare = iscrizione alla campagna + redirect al suo Hub. Se nel frattempo la
  // campagna si è riempita, il messaggio viene comunque consumato (sparisce dagli inviti,
  // vedi InboxStore.acceptInvite) e una modale spiega il motivo invece del redirect.
  protected async accept(invite: CampaignInvite) {
    const { error, full } = await this.inboxStore.acceptInvite(invite);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    if (full) {
      await this.modal.error(
        this.localeService.t('inbox_campaign_full_message'),
        this.localeService.t('inbox_campaign_full_title')
      );
      return;
    }

    await this.activeCampaign.loadCampaignById(invite.campaignId);
    this.appNav.setTab('hub');
  }

  protected async decline(invite: CampaignInvite) {
    const { error } = await this.inboxStore.declineInvite(invite.id);
    if (error) {
      this.modal.error(error.message);
    }
  }

  protected markRead(id: string) {
    this.inboxStore.markAsRead(id);
  }
}
