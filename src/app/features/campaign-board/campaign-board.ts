import { Component, inject, signal, OnInit } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { ActiveCampaign } from '../../core/active-campaign';
import { AppNav } from '../../core/app-nav';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { getCover, CampaignCover, getCoverImagePath } from '../../core/campaign-covers';

interface BoardCampaign {
  id: string;
  name: string;
  description: string | null;
  cover: CampaignCover;
  masterNickname: string;
  characterCount: number;
  editionCode: string;
  ownerId: string;
}

@Component({
  selector: 'app-campaign-board',
  standalone: true,
  templateUrl: './campaign-board.html',
})
export class CampaignBoard implements OnInit {
  private supabase = inject(Supabase);
  private activeCampaign = inject(ActiveCampaign);
  private appNav = inject(AppNav);
  protected auth = inject(Auth);
  protected localeService = inject(LocaleService);

  boardCampaigns = signal<BoardCampaign[]>([]);
  loading = signal(true);
  getCoverImagePath = getCoverImagePath;

  async ngOnInit() {
    await this.loadBoard();
  }

  async loadBoard() {
    this.loading.set(true);

    const { data: campaigns, error } = await this.supabase.client
      .from('campaigns')
      .select('id, name, description, edition_code, cover_key, owner_id')
      .order('created_at', { ascending: false });

    if (error || !campaigns) {
      console.error('Errore caricamento board', error?.message);
      this.boardCampaigns.set([]);
      this.loading.set(false);
      return;
    }

    const ownerIds = [...new Set(campaigns.map((c) => c.owner_id))];
    const campaignIds = campaigns.map((c) => c.id);

    const [{ data: profiles }, { data: characters }] = await Promise.all([
      this.supabase.client.from('profiles').select('id, nickname').in('id', ownerIds),
      this.supabase.client.from('characters').select('id, campaign_id').in('campaign_id', campaignIds),
    ]);

    const nicknameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.nickname]));
    const countMap = new Map<string, number>();
    for (const c of characters ?? []) {
      countMap.set(c.campaign_id, (countMap.get(c.campaign_id) ?? 0) + 1);
    }

    const mapped: BoardCampaign[] = campaigns.map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      cover: getCover(c.cover_key),
      masterNickname: nicknameMap[c.owner_id] ?? '—',
      characterCount: countMap.get(c.id) ?? 0,
      editionCode: c.edition_code,
      ownerId: c.owner_id,
    }));

    this.boardCampaigns.set(mapped);
    this.loading.set(false);
  }

  enterCampaign(campaign: BoardCampaign) {
    this.activeCampaign.selectCampaign({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      edition_code: campaign.editionCode,
      cover_key: campaign.cover.key,
      owner_id: campaign.ownerId,
    });
    this.appNav.setTab('hub');
  }

  async deleteCampaign(event: Event, campaign: BoardCampaign) {
    event.stopPropagation(); // evita che il click apra anche enterCampaign()

    const confirmed = window.confirm(
      `${this.localeService.t('confirm_delete_campaign')} "${campaign.name}"?`
    );
    if (!confirmed) return;

    const { error } = await this.activeCampaign.deleteCampaign(campaign.id);
    if (!error) {
      await this.loadBoard();
    }
  }
}
