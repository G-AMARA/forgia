import { Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { DungeonQuiz } from '../../core/dungeon-quiz';
import { Modal } from '../../core/modal';

interface Domanda {
  testo: string;
  opzioni: string[];
  corretta: number;
}

const DOMANDE: Domanda[] = [
  {
    testo: 'Quale tipo di danno è spesso il più efficace contro i non-morti?',
    opzioni: ['Radiante', 'Necrotico', 'Psichico', 'Tuono'],
    corretta: 0,
  },
  {
    testo: "Come si chiama il piano d'ombra usato per viaggi rapidi tra le distanze?",
    opzioni: ['Piano Etereo', 'Piano Ombra', 'Abisso', 'Limbo'],
    corretta: 1,
  },
  {
    testo: "Quale classe intrattiene un patto con un'entità extraplanare per i suoi poteri?",
    opzioni: ['Mago', 'Chierico', 'Warlock', 'Bardo'],
    corretta: 2,
  },
  {
    testo: 'Qual è il dado di danno di una Spada Lunga impugnata a due mani?',
    opzioni: ['1d6', '1d8', '1d10', '1d12'],
    corretta: 2,
  },
  {
    testo: 'Quale caratteristica determina i punti ferita massimi di un personaggio?',
    opzioni: ['Destrezza', 'Costituzione', 'Saggezza', 'Forza'],
    corretta: 1,
  },
];

@Component({
  selector: 'app-dd-quiz',
  standalone: true,
  templateUrl: './dd-quiz.html',
})
export class DdQuiz implements OnInit {
  private readonly dungeonQuiz = inject(DungeonQuiz);
  private readonly modal = inject(Modal);

  readonly chiuso = output<void>();

  protected readonly domande = DOMANDE;
  protected readonly caricamento = signal(true);
  protected readonly giaGiocatoOggi = signal(false);
  protected readonly indice = signal(0);
  protected readonly rispostaSelezionata = signal<number | null>(null);
  protected readonly confermata = signal(false);
  protected readonly corrette = signal(0);
  protected readonly completato = signal(false);

  protected readonly domandaCorrente = computed(() => this.domande[this.indice()]);
  protected readonly isUltimaDomanda = computed(() => this.indice() === this.domande.length - 1);

  async ngOnInit() {
    this.giaGiocatoOggi.set(await this.dungeonQuiz.playedToday());
    this.caricamento.set(false);
  }

  protected seleziona(opzione: number) {
    if (this.confermata()) return;
    this.rispostaSelezionata.set(opzione);
  }

  protected conferma() {
    const selezionata = this.rispostaSelezionata();
    if (selezionata === null || this.confermata()) return;

    this.confermata.set(true);
    if (selezionata === this.domandaCorrente().corretta) {
      this.corrette.update((v) => v + 1);
    }
  }

  protected async avanti() {
    if (this.isUltimaDomanda()) {
      await this.terminaQuiz();
      return;
    }
    this.indice.update((v) => v + 1);
    this.rispostaSelezionata.set(null);
    this.confermata.set(false);
  }

  protected chiudi() {
    this.chiuso.emit();
  }

  private async terminaQuiz() {
    this.completato.set(true);
    const { xpAwarded, error } = await this.dungeonQuiz.awardResult(this.corrette());

    if (error) {
      await this.modal.error('Non è stato possibile assegnare gli XP: ' + error.message);
      return;
    }

    await this.modal.success(
      `Quiz completato! Hai risposto correttamente a ${this.corrette()}/${this.domande.length} domande e guadagnato ${xpAwarded} XP per la tua Araldica.`
    );
  }
}
