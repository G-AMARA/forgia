import { Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { DungeonQuiz } from '../../core/dungeon-quiz';
import { Modal } from '../../core/modal';
import { domandeDelGiorno } from './dd-quiz-data';

@Component({
  selector: 'app-dd-quiz',
  standalone: true,
  templateUrl: './dd-quiz.html',
})
export class DdQuiz implements OnInit {
  private readonly dungeonQuiz = inject(DungeonQuiz);
  private readonly modal = inject(Modal);

  readonly chiuso = output<void>();

  protected readonly domande = domandeDelGiorno();
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
