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

// v3: le parole erano piazzate senza alcuna intersezione reale fra loro (coordinate scelte a
// mano senza verificare le lettere condivise): sembravano un cruciverba solo perché disposte
// su una griglia, ma erano di fatto blocchi isolati che non si incrociavano MAI, il che
// smentiva il senso stesso di "parole CROCIATE". Le disposizioni qui sotto sono generate e
// validate con uno script (non incluso nel bundle, è un tool di autoring) che garantisce tre
// invarianti per ogni puzzle: 1) ogni parola condivide almeno una lettera con un'altra parola
// e il grafo delle intersezioni risultante è un UNICO componente connesso (si può raggiungere
// ogni parola dalle altre passando per le lettere in comune); 2) nessun conflitto di lettera
// nelle celle condivise; 3) nessuna riga/colonna contiene una sequenza di celle occupate
// adiacenti che mescoli due parole diverse (o una parola e una cella "orfana" priva di un id)
// senza una cella nera di separazione, altrimenti sembrerebbero fuse in un'unica parola.
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

const PUZZLE_DND_2: CrosswordPuzzle = {
  id: 'dnd-crossword-2',
  righe: 12,
  colonne: 16,
  parole: [
    { numero: 1, risposta: 'TROLL', direzione: 'verticale', x: 8, y: 0, indizio: 'Mostro rigenerante che teme solo fuoco e acido' },
    { numero: 2, risposta: 'ANELLO', direzione: 'verticale', x: 3, y: 3, indizio: 'Gioiello magico indossabile, spesso fonte di poteri straordinari' },
    { numero: 3, risposta: 'LUPO', direzione: 'orizzontale', x: 8, y: 4, indizio: 'Animale predatore, spesso evocato da druidi e ranger come compagno' },
    { numero: 4, risposta: 'ORSO', direzione: 'verticale', x: 11, y: 4, indizio: 'Bestione della foresta, temuto per la forza bruta e gli artigli' },
    { numero: 5, risposta: 'STREGONE', direzione: 'orizzontale', x: 0, y: 5, indizio: 'Classe che scaglia magia innata, nel sangue fin dalla nascita' },
    { numero: 6, risposta: 'ELMO', direzione: 'verticale', x: 7, y: 5, indizio: "Protezione per la testa, parte dell'armatura pesante" },
    { numero: 7, risposta: 'BARBARO', direzione: 'verticale', x: 13, y: 5, indizio: 'Classe che canalizza la Furia in battaglia, ignorando il dolore' },
    { numero: 8, risposta: 'MAZZA', direzione: 'verticale', x: 15, y: 5, indizio: 'Arma contundente semplice, prediletta da chierici che non versano sangue' },
    { numero: 9, risposta: 'SPADA', direzione: 'orizzontale', x: 11, y: 6, indizio: "Arma da mischia per eccellenza, in tutte le sue varianti" },
    { numero: 10, risposta: 'VAMPIRO', direzione: 'orizzontale', x: 5, y: 7, indizio: 'Non-morto aristocratico che si nutre di sangue, teme la luce del sole' },
    { numero: 11, risposta: 'FATA', direzione: 'orizzontale', x: 12, y: 9, indizio: 'Piccola creatura magica del feywild, dispettosa e sfuggente' },
    { numero: 12, risposta: 'SCUDO', direzione: 'orizzontale', x: 9, y: 11, indizio: 'Oggetto difensivo imbracciato, aumenta la Classe Armatura' },
  ],
};

const PUZZLE_DND_3: CrosswordPuzzle = {
  id: 'dnd-crossword-3',
  righe: 10,
  colonne: 13,
  parole: [
    { numero: 1, risposta: 'CORAZZA', direzione: 'verticale', x: 12, y: 0, indizio: 'Armatura pesante che copre il torso, forgiata in metallo' },
    { numero: 2, risposta: 'MANTELLO', direzione: 'orizzontale', x: 5, y: 1, indizio: "Indumento che copre le spalle, a volte incantato per l'invisibilità" },
    { numero: 3, risposta: 'ASCIA', direzione: 'verticale', x: 6, y: 1, indizio: 'Arma da mischia tagliente, spesso impugnata a due mani da un barbaro' },
    { numero: 4, risposta: 'LANCIA', direzione: 'verticale', x: 10, y: 1, indizio: 'Arma d’asta con portata maggiore della spada' },
    { numero: 5, risposta: 'DEMONE', direzione: 'verticale', x: 1, y: 3, indizio: 'Creatura malvagia proveniente dagli Abissi, corrotta e crudele' },
    { numero: 6, risposta: 'GRIFONE', direzione: 'verticale', x: 4, y: 3, indizio: 'Creatura per metà aquila e per metà leone, cavalcatura alata' },
    { numero: 7, risposta: 'ARPIA', direzione: 'orizzontale', x: 3, y: 4, indizio: 'Creatura per metà donna e metà uccello, canto ammaliante e letale' },
    { numero: 8, risposta: 'GNOMO', direzione: 'orizzontale', x: 0, y: 7, indizio: 'Razza piccola e ingegnosa, spesso illusionista o inventore' },
    { numero: 9, risposta: 'FRECCIA', direzione: 'orizzontale', x: 2, y: 9, indizio: 'Proiettile scoccato dall’arco, si porta in faretra' },
  ],
};

const PUZZLE_DND_4: CrosswordPuzzle = {
  id: 'dnd-crossword-4',
  righe: 15,
  colonne: 15,
  parole: [
    { numero: 1, risposta: 'PUGNALE', direzione: 'verticale', x: 6, y: 0, indizio: 'Arma da mischia leggera, ideale per un attacco furtivo' },
    { numero: 2, risposta: 'RUNA', direzione: 'verticale', x: 8, y: 3, indizio: "Simbolo magico inciso su un oggetto, ne potenzia l'incantamento" },
    { numero: 3, risposta: 'SIRENA', direzione: 'orizzontale', x: 3, y: 6, indizio: 'Creatura acquatica dal canto ammaliante, insidia i marinai' },
    { numero: 4, risposta: 'IDRA', direzione: 'verticale', x: 4, y: 6, indizio: 'Rettile multi-testa: tagliane una e ne rispuntano due, a meno di bruciare la ferita' },
    { numero: 5, risposta: 'NINFA', direzione: 'verticale', x: 7, y: 6, indizio: 'Spirito della natura legato a un luogo, un bosco o una sorgente' },
    { numero: 6, risposta: 'GEMMA', direzione: 'orizzontale', x: 0, y: 9, indizio: 'Pietra preziosa, componente materiale di molti incantesimi' },
    { numero: 7, risposta: 'KOBOLD', direzione: 'verticale', x: 14, y: 9, indizio: 'Piccolo umanoide rettiliano, vive in tana e ama le trappole' },
    { numero: 8, risposta: 'TALISMANO', direzione: 'orizzontale', x: 6, y: 10, indizio: 'Oggetto magico portafortuna, protegge chi lo indossa' },
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
