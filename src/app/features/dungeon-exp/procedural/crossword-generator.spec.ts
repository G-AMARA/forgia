import { generaPuzzleDelGiorno } from './crossword-generator';
import { costruisciGriglia, type CrosswordPuzzle } from '../dnd-crossword-data';

const GIORNI_SIMULATI = 500;
const GIORNO_BASE = new Date(2026, 0, 1);
const giorno = (offset: number) => new Date(GIORNO_BASE.getTime() + offset * 86_400_000);

const PUZZLE_FALLBACK: CrosswordPuzzle = {
  id: 'fallback-test',
  righe: 3,
  colonne: 3,
  parole: [{ numero: 1, risposta: 'AAA', direzione: 'orizzontale', x: 0, y: 0, indizio: 'test' }],
};

// Grafo di connettività fra parole (arco se condividono una cella con la stessa lettera).
function tutteConnesse(puzzle: CrosswordPuzzle): boolean {
  const griglia = new Map<string, number[]>();
  puzzle.parole.forEach((parola, idx) => {
    for (let i = 0; i < parola.risposta.length; i++) {
      const x = parola.direzione === 'orizzontale' ? parola.x + i : parola.x;
      const y = parola.direzione === 'verticale' ? parola.y + i : parola.y;
      const chiave = `${x},${y}`;
      griglia.set(chiave, [...(griglia.get(chiave) ?? []), idx]);
    }
  });

  const adiacenza = new Map<number, Set<number>>(puzzle.parole.map((_, idx) => [idx, new Set<number>()]));
  for (const idxParole of griglia.values()) {
    for (const a of idxParole) for (const b of idxParole) if (a !== b) adiacenza.get(a)!.add(b);
  }

  const visitati = new Set<number>([0]);
  const coda = [0];
  while (coda.length > 0) {
    const attuale = coda.pop()!;
    for (const vicino of adiacenza.get(attuale) ?? []) {
      if (!visitati.has(vicino)) {
        visitati.add(vicino);
        coda.push(vicino);
      }
    }
  }
  return visitati.size === puzzle.parole.length;
}

describe('generaPuzzleDelGiorno', () => {
  it(`produce sempre un puzzle valido su ${GIORNI_SIMULATI} giorni simulati`, () => {
    let volteInFallback = 0;

    for (let i = 0; i < GIORNI_SIMULATI; i++) {
      const puzzle = generaPuzzleDelGiorno(giorno(i), PUZZLE_FALLBACK);

      if (puzzle.id === PUZZLE_FALLBACK.id) {
        volteInFallback++;
        continue;
      }

      // Il generatore ha come obiettivo minimo 8 parole (MINIMO_PAROLE in
      // crossword-generator.ts): se il puzzle non è il fallback statico, deve rispettarlo.
      expect(puzzle.parole.length).toBeGreaterThanOrEqual(8);

      // Nessun conflitto di lettera: ricostruendo la griglia, ogni cella di ogni parola deve
      // contenere esattamente la lettera attesa (rileva l'"ultima vince silenziosamente").
      const griglia = costruisciGriglia(puzzle);
      for (const parola of puzzle.parole) {
        for (let k = 0; k < parola.risposta.length; k++) {
          const x = parola.direzione === 'orizzontale' ? parola.x + k : parola.x;
          const y = parola.direzione === 'verticale' ? parola.y + k : parola.y;
          expect(griglia[y][x].lettera).toBe(parola.risposta[k]);
        }
      }

      expect(tutteConnesse(puzzle)).toBe(true);

      for (const parola of puzzle.parole) {
        expect(parola.x).toBeGreaterThanOrEqual(0);
        expect(parola.y).toBeGreaterThanOrEqual(0);
        const fineX = parola.direzione === 'orizzontale' ? parola.x + parola.risposta.length - 1 : parola.x;
        const fineY = parola.direzione === 'verticale' ? parola.y + parola.risposta.length - 1 : parola.y;
        expect(fineX).toBeLessThan(puzzle.colonne);
        expect(fineY).toBeLessThan(puzzle.righe);
      }
    }

    // Il fallback deve restare un'eccezione rara, non la norma: se scattasse spesso vorrebbe
    // dire che l'algoritmo di piazzamento è troppo debole rispetto al pool di parole.
    expect(volteInFallback / GIORNI_SIMULATI).toBeLessThan(0.05);
  }, 15_000);

  it('è deterministico per lo stesso giorno', () => {
    const oggi = giorno(42);
    expect(generaPuzzleDelGiorno(oggi, PUZZLE_FALLBACK)).toEqual(generaPuzzleDelGiorno(oggi, PUZZLE_FALLBACK));
  });
});
