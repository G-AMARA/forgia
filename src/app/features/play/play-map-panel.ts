import { Component, inject, input, output } from '@angular/core';
import { MapAlbumImage } from '../../core/map-albums';
import { LocaleService } from '../../core/locale';
import { CampaignToken, TokenPositionEvent } from '../../core/campaign-tokens';
import { FogState } from './fog-of-war-store';
import { InteractiveBoardComponent } from './components/interactive-board/interactive-board';

// Colonna destra della pagina "Gioca": mostra a piena colonna la mappa scelta dal Master
// (vedi PlayMapPicker, dentro PlayMasterPanel > "Mappe e luoghi") dentro il tabellone
// interattivo con pan/zoom e pedine (InteractiveBoardComponent). Solo un pass-through di
// input/output verso il tabellone, nessuna logica di selezione o di sincronizzazione qui
// (quella vive in Play, l'orchestratore).
@Component({
  selector: 'app-play-map-panel',
  standalone: true,
  imports: [InteractiveBoardComponent],
  templateUrl: './play-map-panel.html',
})
export class PlayMapPanel {
  protected localeService = inject(LocaleService);

  readonly canManage = input(false);
  readonly activeImage = input<MapAlbumImage | null>(null);
  readonly tokens = input<CampaignToken[]>([]);
  readonly myCharacterId = input<string | null>(null);

  readonly tokenPositionChange = output<TokenPositionEvent>();
  readonly tokensChanged = output<void>();
  readonly fogChanged = output<FogState>();
}
