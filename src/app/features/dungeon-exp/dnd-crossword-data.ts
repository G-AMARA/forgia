// Dati puri del terzo minigioco del Dungeon EXP Hub. Le coordinate di ogni parola sono
// state calcolate e validate a tavolino (nessun conflitto di lettere alle intersezioni,
// tutte le celle dentro i limiti della griglia) prima di essere fissate qui: aggiungere un
// nuovo CrosswordPuzzle richiede la stessa verifica manuale, la griglia non si autocorregge.

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

// v2: GOBLIN(verticale, col.5)/NANO e ELFO(orizzontale, riga 4)/LICH toccavano la parola
// parallela adiacente senza una cella nera di separazione (NANO iniziava esattamente dove
// finiva GOBLIN nella stessa colonna, LICH esattamente dove finiva ELFO nella stessa riga):
// il risultato era una sola striscia di lettere continua che sembrava un'unica parola
// invece di due. NANO e LICH sono state spostate su righe/colonne proprie, isolate, e la
// disposizione è stata validata con uno script che verifica sia i conflitti di lettere alle
// intersezioni sia l'assenza di parole parallele adiacenti senza gap.
const PUZZLE_DND_1: CrosswordPuzzle = {
  id: 'dnd-crossword-1',
  righe: 13,
  colonne: 11,
  parole: [
    { numero: 1, risposta: 'MAGO', direzione: 'orizzontale', x: 0, y: 0, indizio: 'Classe che scaglia incantesimi attingendo allo studio arcano' },
    { numero: 2, risposta: 'ORCO', direzione: 'verticale', x: 3, y: 0, indizio: 'Umanoide brutale, spesso in orda, classico nemico di basso livello' },
    { numero: 3, risposta: 'DRAGO', direzione: 'orizzontale', x: 2, y: 1, indizio: 'Creatura leggendaria e sputafuoco, incubo di ogni regno' },
    { numero: 4, risposta: 'GOBLIN', direzione: 'verticale', x: 5, y: 1, indizio: 'Piccolo umanoide verde e vigliacco, nemico da manuale base' },
    { numero: 5, risposta: 'CHIERICO', direzione: 'verticale', x: 9, y: 2, indizio: 'Classe che canalizza il potere della propria divinità in incantesimi di cura' },
    { numero: 6, risposta: 'NANO', direzione: 'verticale', x: 10, y: 3, indizio: 'Razza robusta, maestra di forgia e miniera' },
    { numero: 7, risposta: 'ELFO', direzione: 'orizzontale', x: 4, y: 4, indizio: 'Razza longeva ed elegante, affine a magia e arco' },
    { numero: 8, risposta: 'FULMINE', direzione: 'verticale', x: 6, y: 4, indizio: 'Incantesimo che scatena una scarica elettrica lungo una linea' },
    { numero: 9, risposta: 'LICH', direzione: 'verticale', x: 2, y: 5, indizio: 'Non-morto incantatore che lega la propria anima a un phylactery' },
    { numero: 10, risposta: 'PALADINO', direzione: 'verticale', x: 7, y: 5, indizio: 'Guerriero sacro legato da un giuramento solenne' },
    { numero: 11, risposta: 'LADRO', direzione: 'orizzontale', x: 6, y: 6, indizio: 'Classe furtiva, esperta di trappole, serrature e attacchi a sorpresa' },
    { numero: 12, risposta: 'CURA', direzione: 'orizzontale', x: 2, y: 7, indizio: 'Incantesimo che ripristina i punti ferita' },
  ],
};

// Set rotativo: oggi un solo puzzle, ma puzzleDelGiorno() è già pronto per ruotarne di più
// non appena se ne aggiungeranno (stesso indice = stesso puzzle per tutti nella giornata).
export const CRUCIVERBA_DND: CrosswordPuzzle[] = [PUZZLE_DND_1];

export function puzzleDelGiorno(oggi: Date = new Date()): CrosswordPuzzle {
  const giorniEpoca = Math.floor(oggi.getTime() / 86_400_000);
  return CRUCIVERBA_DND[giorniEpoca % CRUCIVERBA_DND.length];
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
