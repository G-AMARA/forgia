import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CampaignTokens, TOKEN_PLACEHOLDER_AVATAR, TokenPositionEvent } from '../../core/campaign-tokens';
import { LocaleService } from '../../core/locale';
import { BoardViewport } from './components/interactive-board/board-viewport';
import { CharacterSheetContext } from '../character-sheet/character-sheet-context';
import { CharacterIdentityService } from '../character-sheet/character-identity';
import { CharacterPrivilegesService } from '../character-sheet/character-privileges';
import { CharacterEquipmentService } from '../character-sheet/character-equipment';
import { CharacterCombatService } from '../character-sheet/character-combat';
import { CharacterInventoryService } from '../character-sheet/character-inventory';
import { CharacterSpellsService } from '../character-sheet/character-spells';
import { CharacterWeaponsService } from '../character-sheet/character-weapons';
import { CharacterDiaryService } from '../character-sheet/character-diary';
import { CharacterVitalStats } from '../character-sheet/character-vital-stats';
import { CharacterAbilityScores } from '../character-sheet/character-ability-scores';
import { CharacterPrivilegesPanel } from '../character-sheet/character-privileges-panel';
import { CharacterSavingThrowsPanel } from '../character-sheet/character-saving-throws-panel';
import { CharacterSkillsTable } from '../character-sheet/character-skills-table';
import { CharacterResistancesTable } from '../character-sheet/character-resistances-table';
import { CharacterInventoryTab } from '../character-sheet/character-inventory-tab';
import { CharacterSpellsTab } from '../character-sheet/character-spells-tab';
import { CharacterWeaponsTab } from '../character-sheet/character-weapons-tab';
import { CharacterDiaryTab } from '../character-sheet/character-diary-tab';

type PlaySection = 'traits' | 'skills' | 'inventory' | 'spells' | 'weapons' | 'diary';

// Pannello compatto del proprio personaggio, colonna sinistra della pagina "Gioca": le
// statistiche vitali (PF/CA/Iniziativa/...) restano sempre visibili in cima, perché sono
// quelle che si guardano di continuo in combattimento; il resto sta in un accordion a
// sezioni per non dover scrollare tra dieci blocchi. Riusa gli stessi servizi e
// sotto-componenti della scheda completa (character-sheet/): qui cambia solo come sono
// organizzati e presentati, non la logica sottostante.
@Component({
  selector: 'app-play-character-panel',
  standalone: true,
  imports: [
    CharacterVitalStats,
    CharacterAbilityScores,
    CharacterPrivilegesPanel,
    CharacterSavingThrowsPanel,
    CharacterSkillsTable,
    CharacterResistancesTable,
    CharacterInventoryTab,
    CharacterSpellsTab,
    CharacterWeaponsTab,
    CharacterDiaryTab,
  ],
  providers: [
    CharacterSheetContext,
    CharacterIdentityService,
    CharacterPrivilegesService,
    CharacterEquipmentService,
    CharacterCombatService,
    CharacterInventoryService,
    CharacterSpellsService,
    CharacterWeaponsService,
    CharacterDiaryService,
  ],
  templateUrl: './play-character-panel.html',
})
export class PlayCharacterPanel implements OnInit {
  protected context = inject(CharacterSheetContext);
  protected localeService = inject(LocaleService);
  private campaignTokens = inject(CampaignTokens);
  // Sempre fornito dal Play padre (unico punto di montaggio di questo componente,
  // vedi play.html), a differenza di Bestiary non serve renderlo opzionale qui.
  private viewport = inject(BoardViewport);

  readonly campaignId = input.required<string>();
  readonly tokensChanged = output<void>();
  // "Centra PG sulla mappa": sposta il TOKEN al centro del viewport corrente (non la vista
  // sul token, vedi centerOnMap()). Play la riceve e la instrada nella stessa pipeline del
  // drag (broadcast + persistenza), esattamente come TokenDrag/D-Pad.
  readonly tokenPositionChange = output<TokenPositionEvent>();

  protected expandedSection = signal<PlaySection | null>(null);

  // Il proprio personaggio ha già una pedina in plancia? Se sì, il pulsante di
  // piazzamento è sostituito da "Centra PG sulla mappa" (niente doppioni, niente
  // re-inserimento accidentale, e un modo per ritrovare la pedina se finita fuori vista).
  protected hasTokenOnMap = computed(() => {
    const characterId = this.context.character()?.id;
    return !!characterId && this.campaignTokens.tokens().some((t) => t.characterId === characterId);
  });

  private myToken = computed(() => {
    const characterId = this.context.character()?.id;
    return this.campaignTokens.tokens().find((t) => t.characterId === characterId) ?? null;
  });

  ngOnInit() {
    this.context.load(undefined);
  }

  toggleSection(section: PlaySection) {
    this.expandedSection.set(this.expandedSection() === section ? null : section);
  }

  async placeOnMap() {
    const character = this.context.character();
    if (!character) return;

    try {
      // getViewportCenter() ha già un fallback interno (centro dell'immagine mondo) se il
      // viewport non è ancora stato misurato: non può restituire null/undefined. Clampato
      // per difesa in profondità, anche se il centro del viewport è normalmente già valido.
      const center = this.viewport.clampToBounds(this.viewport.getViewportCenter());
      const token = await this.campaignTokens.insert({
        campaignId: this.campaignId(),
        characterId: character.id,
        name: character.name,
        avatarUrl: character.avatar_url || TOKEN_PLACEHOLDER_AVATAR,
        x: center.x,
        y: center.y,
        kind: 'character',
      });

      // insert() ritorna null se l'INSERT è stato respinto (es. RLS): l'errore è già
      // loggato dal servizio, qui evitiamo solo di annunciare agli altri client una
      // modifica che non è mai avvenuta.
      if (!token) return;
      this.tokensChanged.emit();
    } catch (err) {
      console.error('[Self-Spawn Error]', err);
    }
  }

  // Sposta il proprio token al centro dell'area attualmente inquadrata (stessa posizione
  // che placeOnMap() userebbe per un piazzamento iniziale): utile per recuperare una
  // pedina finita fuori vista, riportandola dove si sta guardando invece di spostare la
  // visuale a inseguirla.
  centerOnMap() {
    const token = this.myToken();
    if (!token) return;
    const center = this.viewport.clampToBounds(this.viewport.getViewportCenter());
    this.tokenPositionChange.emit({ tokenId: token.id, x: center.x, y: center.y, committed: true });
  }
}
