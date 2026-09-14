// Dati puri del terzo minigioco del Dungeon EXP Hub. Il puzzle del giorno è generato
// proceduralmente da procedural/crossword-generator.ts (pool di parole + backtracking di
// piazzamento, seedato sul giorno locale), con autovalidazione a runtime delle tre invarianti
// che uno script di authoring umano garantiva prima a mano: 1) ogni parola condivide almeno
// una lettera con un'altra e il grafo delle intersezioni è un unico componente connesso; 2)
// nessun conflitto di lettera nelle celle condivise; 3) nessuna riga/colonna contiene una
// sequenza di celle occupate adiacenti che mescoli due parole diverse senza una cella nera di
// separazione. Se la generazione fallisce tutti i tentativi, si ricade su PUZZLE_DND_1 sotto.

import { generaPuzzleDelGiorno } from './procedural/crossword-generator';

export type DirezioneParola = 'orizzontale' | 'verticale';

export interface ParolaCrociata {
  numero: number;
  risposta: string;
  direzione: DirezioneParola;
  x: number;
  y: number;
  indizio: string;
}

export interface CrosswordPuzzle {
  id: string;
  righe: number;
  colonne: number;
  parole: ParolaCrociata[];
}

// Puzzle originale del minigioco, validato a mano: vedi puzzleDelGiorno sotto per il suo ruolo.
const PUZZLE_DND_1: CrosswordPuzzle = {
  id: 'dnd-crossword-1',
  righe: 9,
  colonne: 14,
  parole: [
    { numero: 1, risposta: 'FULMINE', direzione: 'verticale', x: 2, y: 0, indizio: 'Incantesimo che scatena una scarica elettrica lungo una linea' },
    { numero: 2, risposta: 'LADRO', direzione: 'orizzontale', x: 5, y: 0, indizio: 'Classe furtiva, esperta di trappole, serrature e attacchi a sorpresa' },
    { numero: 3, risposta: 'DRAGO', direzione: 'verticale', x: 7, y: 0, indizio: 'Creatura leggendaria e sputafuoco, incubo di ogni regno' },
    { numero: 4, risposta: 'LICH', direzione: 'verticale', x: 0, y: 2, indizio: 'Non-morto incantatore che lega la propria anima a un phylactery' },
    { numero: 5, risposta: 'CURA', direzione: 'verticale', x: 4, y: 2, indizio: 'Incantesimo che ripristina i punti ferita' },
    { numero: 6, risposta: 'MAGO', direzione: 'orizzontale', x: 6, y: 2, indizio: 'Classe che scaglia incantesimi attingendo allo studio arcano' },
    { numero: 7, risposta: 'ORCO', direzione: 'verticale', x: 9, y: 2, indizio: 'Umanoide brutale, spesso in orda, classico nemico di basso livello' },
    { numero: 8, risposta: 'CHIERICO', direzione: 'orizzontale', x: 0, y: 4, indizio: 'Classe che canalizza il potere della propria divinità in incantesimi di cura' },
    { numero: 9, risposta: 'ELFO', direzione: 'verticale', x: 11, y: 4, indizio: 'Razza longeva ed elegante, affine a magia e arco' },
    { numero: 10, risposta: 'GOBLIN', direzione: 'orizzontale', x: 8, y: 5, indizio: 'Piccolo umanoide verde e vigliacco, nemico da manuale base' },
    { numero: 11, risposta: 'NANO', direzione: 'verticale', x: 13, y: 5, indizio: 'Razza robusta, maestra di forgia e miniera' },
    { numero: 12, risposta: 'PALADINO', direzione: 'orizzontale', x: 4, y: 7, indizio: 'Guerriero sacro legato da un giuramento solenne' },
  ],
};

// PUZZLE_DND_1 resta come unico fallback statico: se il generatore procedurale (vedi
// procedural/crossword-generator.ts) esaurisce tutti i tentativi senza produrre un puzzle che
// passa validaPuzzle(), questo layout — già verificato a mano — viene usato al suo posto.
export function puzzleDelGiorno(oggi: Date = new Date()): CrosswordPuzzle {
  return generaPuzzleDelGiorno(oggi, PUZZLE_DND_1);
}

export interface CellaCruciverba {
  // null = cella nera (fuori da ogni parola), altrimenti la lettera corretta attesa.
  lettera: string | null;
  // Numero dell'indizio se una parola inizia proprio in questa cella, altrimenti null.
  numero: number | null;
  // Numero della parola orizzontale/verticale a cui questa cella appartiene (null se nessuna
  // in quella direzione). Non basta sapere "qui finisce una parola": la cella finale di una
  // parola VERTICALE (es. GOBLIN) può stare subito a sinistra dell'inizio di una parola
  // ORIZZONTALE diversa (es. LADRO) nella STESSA riga, senza che GOBLIN sia "la fine di una
  // orizzontale" — eppure le due lettere restano visivamente adiacenti come se fossero un
  // unico rigo. Serve poter confrontare l'ID della parola orizzontale/verticale di due celle
  // vicine per sapere se il rigo di lettere che sembra continuo è davvero la stessa parola.
  orizzontaleId: number | null;
  verticaleId: number | null;
}

export function costruisciGriglia(puzzle: CrosswordPuzzle): CellaCruciverba[][] {
  const griglia: CellaCruciverba[][] = Array.from({ length: puzzle.righe }, () =>
    Array.from({ length: puzzle.colonne }, () => ({ lettera: null, numero: null, orizzontaleId: null, verticaleId: null }))
  );

  for (const parola of puzzle.parole) {
    for (let i = 0; i < parola.risposta.length; i++) {
      const x = parola.direzione === 'orizzontale' ? parola.x + i : parola.x;
      const y = parola.direzione === 'verticale' ? parola.y + i : parola.y;
      griglia[y][x].lettera = parola.risposta[i];
      if (i === 0) griglia[y][x].numero = parola.numero;
      if (parola.direzione === 'orizzontale') griglia[y][x].orizzontaleId = parola.numero;
      else griglia[y][x].verticaleId = parola.numero;
    }
  }

  return griglia;
}

export function grigliaVuota(puzzle: CrosswordPuzzle): string[][] {
  return Array.from({ length: puzzle.righe }, () => Array.from({ length: puzzle.colonne }, () => ''));
}
