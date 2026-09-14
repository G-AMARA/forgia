import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { CharacterStore } from '../../core/character-store';
import { ActiveCampaign } from '../../core/active-campaign';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { getRankForSeconds } from '../../core/ranks';

interface CampaignPlayerRow {
  characterId: string;
  characterName: string;
  nickname: string;
  rankIcon: string;
}

// Pannello "Avventurieri" (Gestisci Campagna, sotto il pannello Inviti): chi ha già un
// personaggio nella campagna (invito accettato), con la possibilità per il Master di
// allontanarlo. Stesso pattern di query di CampaignInvitesPanel (join manuale a profiles).
@Component({
  selector: 'app-campaign-players-panel',
  standalone: true,
  templateUrl: './campaign-players-panel.html',
})
export class CampaignPlayersPanel implements OnInit {
  private supabase = inject(Supabase);
  private characterStore = inject(CharacterStore);
  private activeCampaign = inject(ActiveCampaign);
  private modal = inject(Modal);
  protected localeService = inject(LocaleService);

  @Input({ required: true }) campaignId!: string;

  protected loading = signal(true);
  protected players = signal<CampaignPlayerRow[]>([]);

  ngOnInit() {
    this.loadPlayers();
  }

  // Cancella il PG clone della campagna (non il PG base nella Fucina, vedi
  // CharacterStore.deleteCharacter): stessa azione che il giocatore ha su se stesso da
  // EditHeroModal.removeFromCampaign, qui esposta al Master anche sui PG altrui.
  protected async remove(player: CampaignPlayerRow) {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_remove_hero_from_campaign')} "${player.characterName}"?`,
      {
        cancelLabel: this.localeService.t('cancel_button'),
        confirmLabel: this.localeService.t('confirm_remove_button_confirm'),
      }
    );
    if (!confirmed) return;

    const { error } = await this.characterStore.deleteCharacter(player.characterId);
    if (error) {
      this.modal.error(error.message);
      return;
    }

    this.players.update((list) => list.filter((p) => p.characterId !== player.characterId));
  }

  private async loadPlayers() {
    this.loading.set(true);

    const { data: allRows, error } = await this.supabase.client
      .from('characters')
      .select('id, name, owner_id')
      .eq('campaign_id', this.campaignId)
      .order('created_at', { ascending: false });

    // Il Master può avere un proprio PG nella campagna che sta gestendo, ma non ha senso
    // che compaia tra gli avventurieri "allontanabili" da se stesso.
    const dmId = this.activeCampaign.current()?.owner_id;
    const rows = (allRows ?? []).filter((row) => row.owner_id !== dmId);

    if (error || rows.length === 0) {
      this.players.set([]);
      this.loading.set(false);
      return;
    }

    const ownerIds = [...new Set(rows.map((row) => row.owner_id))];
    const { data: profiles } = await this.supabase.client
      .from('profiles')
      .select('id, nickname, navigation_seconds')
      .in('id', ownerIds);

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    this.players.set(
      rows.map((row) => {
        const profile = profileMap[row.owner_id];
        return {
          characterId: row.id,
          characterName: row.name,
          nickname: profile?.nickname ?? '???',
          rankIcon: getRankForSeconds(profile?.navigation_seconds ?? 0, false).icon,
        };
      })
    );
    this.loading.set(false);
  }
}
