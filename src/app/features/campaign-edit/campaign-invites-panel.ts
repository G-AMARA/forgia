import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { getRankForSeconds } from '../../core/ranks';
import { InviteAdventurerModal } from './invite-adventurer-modal';

type InviteStatus = 'pending' | 'accepted' | 'declined';

interface CampaignInviteRow {
  id: string;
  nickname: string;
  rankIcon: string;
  status: InviteStatus;
}

// Pannello "Inviti" (Gestisci Campagna, sotto Impostazioni & Regole): storico di chi è
// stato invitato a questa campagna e con quale esito (vedi campaign_invites, non più solo
// una coda di pendenti dopo sql/2026-09-14_campaign_invites_status.sql). Ospita anche il
// trigger "Invita Avventuriero", spostato qui dall'header della pagina.
@Component({
  selector: 'app-campaign-invites-panel',
  standalone: true,
  imports: [InviteAdventurerModal],
  templateUrl: './campaign-invites-panel.html',
})
export class CampaignInvitesPanel implements OnInit {
  private supabase = inject(Supabase);
  protected localeService = inject(LocaleService);

  @Input({ required: true }) campaignId!: string;

  protected loading = signal(true);
  protected invites = signal<CampaignInviteRow[]>([]);
  protected showInviteModal = signal(false);

  ngOnInit() {
    this.loadInvites();
  }

  protected openInviteModal() {
    this.showInviteModal.set(true);
  }

  // Riapre il carico dopo la chiusura della modale: potrebbe aver appena inviato nuovi
  // inviti (o riportato a 'pending' un invito rifiutato in precedenza).
  protected closeInviteModal() {
    this.showInviteModal.set(false);
    this.loadInvites();
  }

  private async loadInvites() {
    this.loading.set(true);

    const { data: inviteRows, error } = await this.supabase.client
      .from('campaign_invites')
      .select('id, invited_user_id, status')
      .eq('campaign_id', this.campaignId)
      .order('created_at', { ascending: false });

    if (error || !inviteRows || inviteRows.length === 0) {
      this.invites.set([]);
      this.loading.set(false);
      return;
    }

    const userIds = [...new Set(inviteRows.map((row) => row.invited_user_id))];
    const { data: profiles } = await this.supabase.client
      .from('profiles')
      .select('id, nickname, navigation_seconds')
      .in('id', userIds);

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    this.invites.set(
      inviteRows.map((row) => {
        const profile = profileMap[row.invited_user_id];
        return {
          id: row.id,
          nickname: profile?.nickname ?? '???',
          // Stesso approccio del roster Avventurieri (groupByRank): senza is_admin nel
          // profilo, il rango di un admin è calcolato come utente normale (isAdmin=false).
          rankIcon: getRankForSeconds(profile?.navigation_seconds ?? 0, false).icon,
          status: row.status as InviteStatus,
        };
      })
    );
    this.loading.set(false);
  }
}
