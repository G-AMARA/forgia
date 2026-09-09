import { AfterViewInit, Component, ElementRef, OnDestroy, inject, output, signal, viewChild } from '@angular/core';
import type { default as PhaserType } from 'phaser';
import { DungeonRun } from '../../core/dungeon-run';
import { Modal } from '../../core/modal';
import { CLASSI_DND, NUMERO_GEMME_TOTALI, type ClasseId } from './dungeon-run-data';
import type { DungeonRunScene } from './dungeon-run-scene';

type StatoPartita = 'caricamento' | 'bloccato' | 'selezione-classe' | 'gioco' | 'pausa' | 'terminata';
type RisultatoLivello = { vittoria: boolean; gemme: number; tempoScaduto: boolean };

const DURATA_LIVELLO_SECONDI = 60;

// Componente "guscio" per Phaser: nessuna logica di gioco qui (vive in DungeonRunScene),
// solo ciclo di vita Angular, HUD/overlay in Tailwind e il ponte verso il backend Supabase
// a fine partita. Phaser è caricato con import() dinamico SOLO dopo la scelta della classe:
// è una libreria pesante (~1 MB) che altrimenti finirebbe scaricata anche per chi apre la
// schermata di selezione e poi ripensa e chiude il minigioco.
@Component({
  selector: 'app-dungeon-run',
  standalone: true,
  templateUrl: './dungeon-run.html',
  styleUrl: './dungeon-run.scss',
})
export class DungeonRunGame implements AfterViewInit, OnDestroy {
  private readonly dungeonRun = inject(DungeonRun);
  private readonly modal = inject(Modal);

  readonly chiuso = output<void>();

  private readonly canvasContainer = viewChild.required<ElementRef<HTMLDivElement>>('canvasContainer');

  protected readonly classi = CLASSI_DND;
  protected readonly gemmeTotali = NUMERO_GEMME_TOTALI;
  protected readonly stato = signal<StatoPartita>('caricamento');
  protected readonly classeSelezionata = signal<ClasseId | null>(null);
  protected readonly gemmeRaccolte = signal(0);
  protected readonly cooldownPronto = signal(1);
  protected readonly tempoRimanente = signal(DURATA_LIVELLO_SECONDI);
  protected readonly risultato = signal<RisultatoLivello | null>(null);

  private game: PhaserType.Game | null = null;
  private scenaAttiva: DungeonRunScene | null = null;
  // Blocca un secondo avvio mentre import()/new Phaser.Game() sono ancora in corso (un
  // doppio click su una card classe altrimenti creerebbe due istanze di gioco indipendenti,
  // ciascuna capace di raggiungere la vittoria e chiamare due volte la RPC di accredito).
  private avvioInCorso = false;

  async ngAfterViewInit() {
    const giaGiocatoOggi = await this.dungeonRun.playedToday();
    this.stato.set(giaGiocatoOggi ? 'bloccato' : 'selezione-classe');
  }

  ngOnDestroy() {
    this.distruggiGiocoCorrente();
  }

  protected selezionaClasse(classeId: ClasseId) {
    this.classeSelezionata.set(classeId);
    void this.avviaGioco(classeId);
  }

  // Chiama direttamente game.scene (il SceneManager) invece di passare da un metodo della
  // scena: isPaused per la UI è lo stato Angular stesso (stato() === 'pausa'), non serve
  // duplicarlo lato Phaser.
  protected pausa() {
    this.game?.scene.pause('dungeon-run');
    this.stato.set('pausa');
  }

  protected riprendi() {
    this.game?.scene.resume('dungeon-run');
    this.stato.set('gioco');
  }

  // "Riprova"/"Riavvia" NON riusano la scena esistente in alcun modo (né scene.restart(),
  // né un reset in-place): distruggono l'intera istanza Phaser.Game e ne creano una nuova
  // da zero con avviaGioco(), la STESSA via della primissima partita. È l'unico reset che
  // non può lasciarsi dietro stato residuo (fisica in pausa, tint, camera), perché non c'è
  // nulla da resettare: l'istanza precedente non esiste più.
  protected riavvia() {
    if (this.stato() === 'bloccato' || this.stato() === 'selezione-classe') return;
    const classeId = this.classeSelezionata();
    if (!classeId) return;

    this.distruggiGiocoCorrente();
    this.gemmeRaccolte.set(0);
    this.cooldownPronto.set(1);
    this.tempoRimanente.set(DURATA_LIVELLO_SECONDI);
    this.risultato.set(null);
    this.stato.set('caricamento');
    void this.avviaGioco(classeId);
  }

  // L'XP viene accreditato SOLO uscendo dal dungeon (questo metodo), non al termine della
  // partita: se dopo una vittoria/sconfitta si preme "Riprova" invece di uscire, quel
  // tentativo non viene mai accreditato (risultato() viene azzerato da riavvia()). Questo
  // stesso metodo serve sia per il pulsante "Esci dal Dungeon" sia per la "✕" in alto: in
  // entrambi i casi, se c'è un risultato in sospeso, prima lo si accredita.
  protected async chiudi() {
    const risultatoInSospeso = this.risultato();
    if (risultatoInSospeso) {
      await this.assegnaXp(risultatoInSospeso);
    }
    this.chiuso.emit();
  }

  // "Torna alla selezione" dalla schermata di fine partita: a differenza di chiudi() (che
  // esce dal minigioco verso l'hub) questo distrugge solo l'istanza Phaser corrente per
  // permettere di scegliere di nuovo la classe (Mago/Guerriero) senza lasciare Dungeon Run.
  protected tornaAllaSelezione() {
    this.distruggiGiocoCorrente();
    this.classeSelezionata.set(null);
    this.gemmeRaccolte.set(0);
    this.cooldownPronto.set(1);
    this.tempoRimanente.set(DURATA_LIVELLO_SECONDI);
    this.risultato.set(null);
    this.stato.set('selezione-classe');
  }

  private distruggiGiocoCorrente() {
    this.game?.destroy(true);
    this.game = null;
    this.scenaAttiva = null;
    this.avvioInCorso = false;
  }

  protected abilitaClasseAttiva() {
    return this.classi.find((c) => c.id === this.classeSelezionata());
  }

  private async avviaGioco(classeId: ClasseId) {
    if (this.avvioInCorso) return;
    this.avvioInCorso = true;

    const [{ default: Phaser }, { DungeonRunScene: Scene }] = await Promise.all([
      import('phaser'),
      import('./dungeon-run-scene'),
    ]);

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.canvasContainer().nativeElement,
      width: 800,
      height: 450,
      backgroundColor: '#0a0a0c',
      // Asset pixel art (0x72_DungeonTilesetII, sprite nativi 16px): pixelArt:true forza il
      // filtro NEAREST su tutte le texture e disabilita l'antialiasing, altrimenti Phaser le
      // sfoca ridimensionandole con setScale().
      pixelArt: true,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 800 }, debug: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    });

    this.game.canvas.style.imageRendering = 'pixelated';

    this.game.scene.add('dungeon-run', Scene, true, {
      classeId,
      callbacks: {
        onGemCollected: (totale: number) => this.gemmeRaccolte.set(totale),
        onCooldownUpdate: (prontezza: number) => this.cooldownPronto.set(prontezza),
        onTimerUpdate: (secondi: number) => this.tempoRimanente.set(secondi),
        onGameEnd: (esito: RisultatoLivello) => this.gestisciFineGioco(esito),
      },
    });
    this.scenaAttiva = this.game.scene.getScene('dungeon-run') as DungeonRunScene;

    this.stato.set('gioco');
    this.avvioInCorso = false;
  }

  private gestisciFineGioco(esito: RisultatoLivello) {
    this.risultato.set(esito);
    this.stato.set('terminata');
  }

  // Chiamata SOLO da chiudi(): il bonus di completamento (+10) dipende da r.vittoria, le
  // gemme valgono comunque +1 l'una anche in sconfitta (vedi DungeonRun.awardResult).
  // L'XP mostrato in dungeon-run.html è invece SEMPRE calcolato localmente (gemme*1, +10 se
  // vittoria): non deve dipendere dall'esito di questa chiamata di rete né azzerarsi se il
  // limite giornaliero era già stato raggiunto in sessione.
  private async assegnaXp(r: RisultatoLivello) {
    const { error, giaAccreditatoOggi } = await this.dungeonRun.awardResult(r.gemme, r.vittoria);

    // "Già accreditato oggi" non è un guasto (è il limite giornaliero previsto, vedi
    // award_dungeon_run_xp), ma va comunque segnalato: senza questo avviso l'XP mostrato a
    // schermo sembra assegnato mentre in realtà il DB (e quindi l'Araldica) non si è mosso,
    // e durante un test ripetuto nello stesso giorno passerebbe inosservato.
    if (giaAccreditatoOggi) {
      await this.modal.success(
        "Hai già ricevuto l'XP di Dungeon Run oggi: il prossimo accredito reale sarà disponibile domani. L'XP mostrato in questa schermata era solo il punteggio della sessione corrente.",
        'Limite giornaliero raggiunto'
      );
      return;
    }

    if (error) {
      await this.modal.error('Non è stato possibile assegnare gli XP: ' + error.message);
    }
  }
}
