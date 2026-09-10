// Dati puri del terzo minigioco del Dungeon EXP Hub. Le coordinate di ogni parola sono
// state calcolate e validate a tavolino (nessun conflitto di lettere alle intersezioni,
// tutte le celle dentro i limiti della griglia, nessuna parola parallela adiacente senza
// una cella nera di separazione) prima di essere fissate qui: aggiungere un nuovo
// CrosswordPuzzle richiede la stessa verifica manuale, la griglia non si autocorregge.

import { indiceGiornoLocale } from './daily-rotation';

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

const PUZZLE_DND_2: CrosswordPuzzle = {
  id: 'dnd-crossword-2',
  righe: 14,
  colonne: 17,
  parole: [
    { numero: 1, risposta: 'LUPO', direzione: 'orizzontale', x: 0, y: 0, indizio: 'Animale predatore, spesso evocato da druidi e ranger come compagno' },
    { numero: 2, risposta: 'ORSO', direzione: 'verticale', x: 3, y: 0, indizio: 'Bestione della foresta, temuto per la forza bruta e gli artigli' },
    { numero: 3, risposta: 'FATA', direzione: 'verticale', x: 11, y: 0, indizio: 'Piccola creatura magica del feywild, dispettosa e sfuggente' },
    { numero: 4, risposta: 'VAMPIRO', direzione: 'orizzontale', x: 10, y: 1, indizio: 'Non-morto aristocratico che si nutre di sangue, teme la luce del sole' },
    { numero: 5, risposta: 'SPADA', direzione: 'orizzontale', x: 3, y: 2, indizio: "Arma da mischia per eccellenza, in tutte le sue varianti" },
    { numero: 6, risposta: 'ELMO', direzione: 'orizzontale', x: 0, y: 3, indizio: "Protezione per la testa, parte dell'armatura pesante" },
    { numero: 7, risposta: 'BARBARO', direzione: 'verticale', x: 1, y: 5, indizio: 'Classe che canalizza la Furia in battaglia, ignorando il dolore' },
    { numero: 8, risposta: 'STREGONE', direzione: 'verticale', x: 9, y: 6, indizio: 'Classe che scaglia magia innata, nel sangue fin dalla nascita' },
    { numero: 9, risposta: 'TROLL', direzione: 'orizzontale', x: 0, y: 7, indizio: 'Mostro rigenerante che teme solo fuoco e acido' },
    { numero: 10, risposta: 'MAZZA', direzione: 'verticale', x: 6, y: 7, indizio: 'Arma contundente semplice, prediletta da chierici che non versano sangue' },
    { numero: 11, risposta: 'SCUDO', direzione: 'orizzontale', x: 12, y: 8, indizio: 'Oggetto difensivo imbracciato, aumenta la Classe Armatura' },
    { numero: 12, risposta: 'ANELLO', direzione: 'orizzontale', x: 7, y: 13, indizio: 'Gioiello magico indossabile, spesso fonte di poteri straordinari' },
  ],
};

const PUZZLE_DND_3: CrosswordPuzzle = {
  id: 'dnd-crossword-3',
  righe: 14,
  colonne: 16,
  parole: [
    { numero: 1, risposta: 'GNOMO', direzione: 'orizzontale', x: 0, y: 0, indizio: 'Razza piccola e ingegnosa, spesso illusionista o inventore' },
    { numero: 2, risposta: 'FRECCIA', direzione: 'verticale', x: 10, y: 0, indizio: 'Proiettile scoccato dall’arco, si porta in faretra' },
    { numero: 3, risposta: 'DEMONE', direzione: 'verticale', x: 15, y: 0, indizio: 'Creatura malvagia proveniente dagli Abissi, corrotta e crudele' },
    { numero: 4, risposta: 'GRIFONE', direzione: 'orizzontale', x: 9, y: 1, indizio: 'Creatura per metà aquila e per metà leone, cavalcatura alata' },
    { numero: 5, risposta: 'ARPIA', direzione: 'orizzontale', x: 1, y: 2, indizio: 'Creatura per metà donna e metà uccello, canto ammaliante e letale' },
    { numero: 6, risposta: 'ASCIA', direzione: 'orizzontale', x: 0, y: 4, indizio: 'Arma da mischia tagliente, spesso impugnata a due mani da un barbaro' },
    { numero: 7, risposta: 'MANTELLO', direzione: 'verticale', x: 9, y: 6, indizio: "Indumento che copre le spalle, a volte incantato per l'invisibilità" },
    { numero: 8, risposta: 'LANCIA', direzione: 'verticale', x: 1, y: 7, indizio: 'Arma d’asta con portata maggiore della spada' },
    { numero: 9, risposta: 'CORAZZA', direzione: 'orizzontale', x: 1, y: 10, indizio: 'Armatura pesante che copre il torso, forgiata in metallo' },
  ],
};

const PUZZLE_DND_4: CrosswordPuzzle = {
  id: 'dnd-crossword-4',
  righe: 11,
  colonne: 14,
  parole: [
    { numero: 1, risposta: 'SIRENA', direzione: 'orizzontale', x: 0, y: 0, indizio: 'Creatura acquatica dal canto ammaliante, insidia i marinai' },
    { numero: 2, risposta: 'IDRA', direzione: 'verticale', x: 1, y: 0, indizio: 'Rettile multi-testa: tagliane una e ne rispuntano due, a meno di bruciare la ferita' },
    { numero: 3, risposta: 'NINFA', direzione: 'verticale', x: 9, y: 0, indizio: 'Spirito della natura legato a un luogo, un bosco o una sorgente' },
    { numero: 4, risposta: 'KOBOLD', direzione: 'orizzontale', x: 0, y: 4, indizio: 'Piccolo umanoide rettiliano, vive in tana e ama le trappole' },
    { numero: 5, risposta: 'RUNA', direzione: 'verticale', x: 8, y: 4, indizio: "Simbolo magico inciso su un oggetto, ne potenzia l'incantamento" },
    { numero: 6, risposta: 'PUGNALE', direzione: 'orizzontale', x: 7, y: 5, indizio: 'Arma da mischia leggera, ideale per un attacco furtivo' },
    { numero: 7, risposta: 'GEMMA', direzione: 'verticale', x: 1, y: 6, indizio: 'Pietra preziosa, componente materiale di molti incantesimi' },
    { numero: 8, risposta: 'TALISMANO', direzione: 'orizzontale', x: 0, y: 10, indizio: 'Oggetto magico portafortuna, protegge chi lo indossa' },
  ],
};

// Set rotativo: un puzzle diverso per ogni giorno di calendario (mezzanotte locale, vedi
// indiceGiornoLocale in daily-rotation.ts), a ciclo dopo 4 giorni. Aggiungere un puzzle qui
// basta a rendere il ciclo più lungo, purché sia stato validato con lo stesso script usato
// per questi quattro (nessun conflitto di lettere, nessuna parola parallela adiacente senza
// gap — vedi commento in testa al file).
export const CRUCIVERBA_DND: CrosswordPuzzle[] = [PUZZLE_DND_1, PUZZLE_DND_2, PUZZLE_DND_3, PUZZLE_DND_4];

export function puzzleDelGiorno(oggi: Date = new Date()): CrosswordPuzzle {
  return CRUCIVERBA_DND[indiceGiornoLocale(oggi) % CRUCIVERBA_DND.length];
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
