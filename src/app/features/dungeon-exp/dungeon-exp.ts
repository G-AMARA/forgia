import { Component, signal } from '@angular/core';
import { DdQuiz } from './dd-quiz';
import { DdCrossword } from './dnd-crossword';
import { DungeonRunGame } from './dungeon-run';

type MinigiocoId = 'quiz' | 'run' | 'crossword';

interface Minigioco {
  id: MinigiocoId;
  nome: string;
  descrizione: string;
  icona: string;
}

const MINIGIOCHI: Minigioco[] = [
  {
    id: 'quiz',
    nome: 'Cripta degli Enigmi',
    descrizione: "Rispondi alle domande sul mondo di D&D 5e e guadagna XP reale per la tua Araldica.",
    icona: '📜',
  },
  {
    id: 'run',
    nome: 'Dungeon Run',
    descrizione: 'Platformer a scorrimento: raccogli gemme ed evita trappole e nemici fino al portale finale.',
    icona: '🗡️',
  },
  {
    id: 'crossword',
    nome: 'Parole Crociate D&D',
    descrizione: 'Risolvi il cruciverba a tema D&D: classi, mostri e incantesimi iconici, contro il tempo.',
    icona: '📝',
  },
];

@Component({
  selector: 'app-dungeon-exp',
  standalone: true,
  imports: [DdQuiz, DungeonRunGame, DdCrossword],
  templateUrl: './dungeon-exp.html',
})
export class DungeonExp {
  protected readonly minigiochi = MINIGIOCHI;
  protected readonly giocoAttivo = signal<MinigiocoId | null>(null);

  protected avviaGioco(id: Minigioco['id']) {
    this.giocoAttivo.set(id);
  }

  protected chiudiGioco() {
    this.giocoAttivo.set(null);
  }
}
