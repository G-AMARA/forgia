import { Component, OnDestroy, OnInit, computed, inject, output, signal } from '@angular/core';
import { Auth } from '../../core/auth';
import { DungeonCrossword } from '../../core/dungeon-crossword';
import { Modal } from '../../core/modal';
import { EXP_PER_HOUR } from '../../core/ranks';
import { DdCrosswordGrid } from './dnd-crossword-grid';
import { costruisciGriglia, grigliaVuota, puzzleDelGiorno } from './dnd-crossword-data';

type StatoCruciverba = 'caricamento' | 'bloccato' | 'gioco' | 'risultato';

// Componente "guscio" del terzo minigioco del Dungeon EXP Hub: la griglia vera e propria
// (rendering, focus, navigazione da tastiera, colorazione celle) vive nel sotto-componente
// DdCrosswordGrid (dnd-crossword-grid.ts). Qui restano lo stato di partita, il timer, il
// conteggio del risultato finale e il ponte verso il backend Supabase.
//
// La sfida ha un unico momento di valutazione: "Guarda il risultato" (guardaRisultato()).
// Prima di quel click nessuna cella si colora né si blocca (vedi input `mostraRisultato`
// passato al sotto-componente). Da quel click la partita è conclusa e mostra un unico
// pulsante "Esci": accredita il risultato via RPC (stesso pattern "credito all'uscita" di
// DungeonRunGame.chiudi() in dungeon-run.ts) e aggiorna subito Auth.navigationSeconds
// (core/auth.ts) così il resto dell'app — limiti PG/PNG, badge rango — riflette il nuovo
// XP senza dover ricaricare la pagina.
@Component({
  selector: 'app-dnd-crossword',
  standalone: true,
  imports: [DdCrosswordGrid],
  templateUrl: './dnd-crossword.html',
})
export class DdCrossword implements OnInit, OnDestroy {
  private readonly auth = inject(Auth);
  private readonly dungeonCrossword = inject(DungeonCrossword);
  private readonly modal = inject(Modal);

  readonly chiuso = output<void>();

  protected readonly puzzle = puzzleDelGiorno();
  protected readonly griglia = costruisciGriglia(this.puzzle);
  protected readonly indiziOrizzontali = this.puzzle.parole.filter((p) => p.direzione === 'orizzontale');
  protected readonly indiziVerticali = this.puzzle.parole.filter((p) => p.direzione === 'verticale');
  protected readonly totaleParole = this.puzzle.parole.length;
  protected readonly totaleLettere = this.griglia.reduce((tot, riga) => tot + riga.filter((c) => c.lettera).length, 0);

  protected readonly celle = signal(grigliaVuota(this.puzzle));
  protected readonly stato = signal<StatoCruciverba>('caricamento');
  protected readonly secondiTrascorsi = signal(0);
  protected readonly mostraRisultato = signal(false);
  protected readonly paroleCorrette = signal(0);

  protected readonly lettereInserite = computed(() =>
    this.celle().reduce((totale, riga, y) => totale + riga.filter((l, x) => l && this.griglia[y][x].lettera).length, 0)
  );
  protected readonly tempoFormattato = computed(() => this.formattaTempo(this.secondiTrascorsi()));
  protected readonly paroleSbagliate = computed(() => this.totaleParole - this.paroleCorrette());
  // Mostrato subito nel pannello di risultato: stessa formula del server
  // (DungeonCrossword.awardResult), l'accredito reale avviene solo all'uscita.
  protected readonly xpCalcolato = computed(() => Math.max(0, this.paroleCorrette() * 2 - this.paroleSbagliate()));

  private timerId: ReturnType<typeof setInterval> | null = null;

  async ngOnInit() {
    const giaGiocatoOggi = await this.dungeonCrossword.playedToday();
    if (giaGiocatoOggi) {
      this.stato.set('bloccato');
      return;
    }
    this.avviaTimer();
  }

  ngOnDestroy() {
    this.fermaTimer();
  }

  // Unico punto di valutazione della griglia: da qui in poi la partita è conclusa, la
  // griglia si blocca colorata e l'unica azione possibile è "Esci" (vedi chiudi()).
  protected guardaRisultato() {
    this.fermaTimer();
    this.paroleCorrette.set(this.calcolaParoleCorrette());
    this.mostraRisultato.set(true);
    this.stato.set('risultato');
  }

  protected async chiudi() {
    if (this.stato() === 'risultato') {
      await this.assegnaXp();
    }
    this.chiuso.emit();
  }

  private async assegnaXp() {
    const { xpAwarded, error } = await this.dungeonCrossword.awardResult(this.paroleCorrette(), this.totaleParole);

    if (error?.message.includes('already completed today')) {
      await this.modal.success(
        "Hai già ricevuto l'XP delle Parole Crociate oggi: il prossimo accredito reale sarà disponibile domani.",
        'Limite giornaliero raggiunto'
      );
      return;
    }

    if (error) {
      await this.modal.error('Non è stato possibile assegnare gli XP: ' + error.message);
      return;
    }

    // Stessa conversione xp -> secondi usata dalla RPC (v_xp * 360, con 3600/EXP_PER_HOUR
    // = 360): tiene Auth.navigationSeconds allineato al valore appena scritto su profiles
    // senza attendere un reload o un nuovo login (vedi Auth.addNavigationSeconds).
    this.auth.addNavigationSeconds(xpAwarded * (3600 / EXP_PER_HOUR));
  }

  private calcolaParoleCorrette(): number {
    const celle = this.celle();
    let corrette = 0;

    for (const parola of this.puzzle.parole) {
      let corretta = true;
      for (let i = 0; i < parola.risposta.length; i++) {
        const x = parola.direzione === 'orizzontale' ? parola.x + i : parola.x;
        const y = parola.direzione === 'verticale' ? parola.y + i : parola.y;
        if (celle[y][x] !== parola.risposta[i]) {
          corretta = false;
          break;
        }
      }
      if (corretta) corrette++;
    }

    return corrette;
  }

  private avviaTimer() {
    this.stato.set('gioco');
    this.timerId = setInterval(() => this.secondiTrascorsi.update((v) => v + 1), 1000);
  }

  private fermaTimer() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private formattaTempo(secondi: number): string {
    const minuti = Math.floor(secondi / 60);
    const resto = secondi % 60;
    return `${minuti}:${resto.toString().padStart(2, '0')}`;
  }
}
