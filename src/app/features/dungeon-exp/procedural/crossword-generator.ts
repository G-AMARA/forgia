// Algoritmo di packing del cruciverba: piazza un sottoinsieme del pool su una griglia
// virtuale, con retry deterministico se il piazzamento non raggiunge la soglia minima di
// parole o fallisce l'autovalidazione. Sostituisce i 4 puzzle statici cablati a mano — qui non
// c'è più uno script di authoring umano a valle, quindi il generatore deve autovalidarsi da
// solo prima di consegnare un puzzle al componente.

import { creaRngGiornaliero, tierDifficolta } from '../daily-rotation';
import { rngShuffle, type Rng } from './rng-utils';
import { POOL_PAROLE_DND, type VoceCrossword } from './crossword-pool';
import type { CrosswordPuzzle, DirezioneParola, ParolaCrociata } from '../dnd-crossword-data';

const MAX_TENTATIVI = 20;
const MINIMO_PAROLE = 8;
const GRIGLIA_VIRTUALE = 25; // ampia a sufficienza da non vincolare il piazzamento; si fa il crop dopo
const CENTRO = Math.floor(GRIGLIA_VIRTUALE / 2);

interface CellaVirtuale {
  lettera: string;
  idParola: number;
  direzione: DirezioneParola;
}

interface ParolaPiazzata {
  id: number;
  voce: VoceCrossword;
  x: number;
  y: number;
  direzione: DirezioneParola;
}

function celle(parola: string, x: number, y: number, direzione: DirezioneParola): { x: number; y: number; lettera: string }[] {
  return [...parola].map((lettera, i) => ({
    x: direzione === 'orizzontale' ? x + i : x,
    y: direzione === 'verticale' ? y + i : y,
    lettera,
  }));
}

function dentroLimiti(x: number, y: number): boolean {
  return x >= 0 && x < GRIGLIA_VIRTUALE && y >= 0 && y < GRIGLIA_VIRTUALE;
}

// Verifica se `parola` può essere piazzata a (x,y,direzione): dentro i bounds, nessun
// conflitto di lettera sulle celle già occupate, cella prima/dopo libera (niente fusione con
// una parola adiacente), perpendicolari libere sulle celle nuove (niente intersezioni
// accidentali), e almeno un'intersezione reale con una parola già piazzata (tranne la prima).
function posizioneValida(
  griglia: Map<string, CellaVirtuale>,
  parola: string,
  x: number,
  y: number,
  direzione: DirezioneParola,
  richiedeIntersezione: boolean
): boolean {
  const puntiCella = celle(parola, x, y, direzione);
  if (puntiCella.some((c) => !dentroLimiti(c.x, c.y))) return false;

  const prima = direzione === 'orizzontale' ? { x: x - 1, y } : { x, y: y - 1 };
  const dopo = direzione === 'orizzontale' ? { x: x + puntiCella.length, y } : { x, y: y + puntiCella.length };
  if (dentroLimiti(prima.x, prima.y) && griglia.has(`${prima.x},${prima.y}`)) return false;
  if (dentroLimiti(dopo.x, dopo.y) && griglia.has(`${dopo.x},${dopo.y}`)) return false;

  let haIntersezione = false;
  for (const c of puntiCella) {
    const esistente = griglia.get(`${c.x},${c.y}`);
    if (esistente) {
      if (esistente.lettera !== c.lettera) return false;
      if (esistente.direzione === direzione) return false; // sovrapposizione parallela = fusione
      haIntersezione = true;
      continue;
    }
    // Cella libera: le perpendicolari devono essere libere, altrimenti l'intersezione
    // sarebbe con una lettera "isolata" non intenzionale.
    const perp =
      direzione === 'orizzontale'
        ? [{ x: c.x, y: c.y - 1 }, { x: c.x, y: c.y + 1 }]
        : [{ x: c.x - 1, y: c.y }, { x: c.x + 1, y: c.y }];
    if (perp.some((p) => dentroLimiti(p.x, p.y) && griglia.has(`${p.x},${p.y}`))) return false;
  }

  return !richiedeIntersezione || haIntersezione;
}

function piazza(griglia: Map<string, CellaVirtuale>, parola: string, x: number, y: number, direzione: DirezioneParola, id: number): void {
  for (const c of celle(parola, x, y, direzione)) {
    griglia.set(`${c.x},${c.y}`, { lettera: c.lettera, idParola: id, direzione });
  }
}

function trovaPosizioni(griglia: Map<string, CellaVirtuale>, parola: string): { x: number; y: number; direzione: DirezioneParola }[] {
  const candidate: { x: number; y: number; direzione: DirezioneParola }[] = [];
  for (let i = 0; i < parola.length; i++) {
    for (const [chiave, cella] of griglia) {
      if (cella.lettera !== parola[i]) continue;
      const [cx, cy] = chiave.split(',').map(Number);
      const direzioneOpposta: DirezioneParola = cella.direzione === 'orizzontale' ? 'verticale' : 'orizzontale';
      const x = direzioneOpposta === 'orizzontale' ? cx - i : cx;
      const y = direzioneOpposta === 'verticale' ? cy - i : cy;
      if (posizioneValida(griglia, parola, x, y, direzioneOpposta, true)) {
        candidate.push({ x, y, direzione: direzioneOpposta });
      }
    }
  }
  return candidate;
}

function tentaPiazzamento(rng: Rng, tier: number): ParolaPiazzata[] {
  const poolFiltrato = POOL_PAROLE_DND.filter((v) => v.difficolta <= tier + 1);
  const poolMescolato = rngShuffle(poolFiltrato, rng);
  const obiettivoParole = Math.min(8 + tier, poolMescolato.length);

  const griglia = new Map<string, CellaVirtuale>();
  const piazzate: ParolaPiazzata[] = [];

  const prima = poolMescolato.shift();
  if (!prima) return piazzate;
  piazza(griglia, prima.risposta, CENTRO, CENTRO, 'orizzontale', 0);
  piazzate.push({ id: 0, voce: prima, x: CENTRO, y: CENTRO, direzione: 'orizzontale' });

  for (const voce of poolMescolato) {
    if (piazzate.length >= obiettivoParole) break;
    const candidate = trovaPosizioni(griglia, voce.risposta);
    if (candidate.length === 0) continue;

    const scelta = candidate[Math.floor(rng() * candidate.length)];
    const id = piazzate.length;
    piazza(griglia, voce.risposta, scelta.x, scelta.y, scelta.direzione, id);
    piazzate.push({ id, voce, x: scelta.x, y: scelta.y, direzione: scelta.direzione });
  }

  return piazzate;
}

function costruisciPuzzle(piazzate: ParolaPiazzata[], oggi: Date): CrosswordPuzzle {
  const minX = Math.min(...piazzate.map((p) => p.x));
  const minY = Math.min(...piazzate.map((p) => p.y));
  const maxX = Math.max(...piazzate.map((p) => (p.direzione === 'orizzontale' ? p.x + p.voce.risposta.length - 1 : p.x)));
  const maxY = Math.max(...piazzate.map((p) => (p.direzione === 'verticale' ? p.y + p.voce.risposta.length - 1 : p.y)));

  // Numerazione standard: le celle di inizio parola, ordinate in reading order (riga poi
  // colonna); una cella che è inizio sia di orizzontale che verticale condivide il numero.
  const inizi = new Map<string, number>();
  const ordinati = [...piazzate].sort((a, b) => (a.y - minY) * 1000 + (a.x - minX) - ((b.y - minY) * 1000 + (b.x - minX)));
  let prossimoNumero = 1;
  const parole: ParolaCrociata[] = ordinati.map((p) => {
    const chiave = `${p.x},${p.y}`;
    if (!inizi.has(chiave)) inizi.set(chiave, prossimoNumero++);
    return {
      numero: inizi.get(chiave)!,
      risposta: p.voce.risposta,
      direzione: p.direzione,
      x: p.x - minX,
      y: p.y - minY,
      indizio: p.voce.indizio,
    };
  });

  return {
    id: `dnd-crossword-${oggi.getTime()}`,
    righe: maxY - minY + 1,
    colonne: maxX - minX + 1,
    parole,
  };
}

// Sostituisce lo script di authoring umano che validava i puzzle statici offline: qui non c'è
// nessuno a valle a controllare, quindi il generatore deve verificare da sé le tre invarianti
// che il vecchio commento di dnd-crossword-data.ts richiedeva a mano.
function validaPuzzle(puzzle: CrosswordPuzzle): void {
  if (puzzle.parole.length < MINIMO_PAROLE) throw new Error(`Solo ${puzzle.parole.length} parole piazzate, minimo ${MINIMO_PAROLE}`);

  const griglia = new Map<string, { lettera: string; parole: number[] }>();
  puzzle.parole.forEach((parola, idx) => {
    for (let i = 0; i < parola.risposta.length; i++) {
      const x = parola.direzione === 'orizzontale' ? parola.x + i : parola.x;
      const y = parola.direzione === 'verticale' ? parola.y + i : parola.y;
      const chiave = `${x},${y}`;
      const esistente = griglia.get(chiave);
      if (esistente) {
        if (esistente.lettera !== parola.risposta[i]) throw new Error(`Conflitto di lettera in (${x},${y})`);
        esistente.parole.push(idx);
      } else {
        griglia.set(chiave, { lettera: parola.risposta[i], parole: [idx] });
      }
    }
  });

  // Connettività: grafo parole-parole con arco se condividono una cella, deve essere un unico
  // componente connesso.
  const adiacenza = new Map<number, Set<number>>(puzzle.parole.map((_, idx) => [idx, new Set<number>()]));
  for (const { parole: idxParole } of griglia.values()) {
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
  if (visitati.size !== puzzle.parole.length) throw new Error('Grafo delle parole non connesso');

  // Nessuna fusione illecita: ogni sequenza di celle contigue in riga/colonna deve appartenere
  // a un'unica parola orizzontale/verticale.
  const celleOrdinate = [...griglia.keys()].map((k) => k.split(',').map(Number) as [number, number]);
  for (const [x, y] of celleOrdinate) {
    verificaSequenza(griglia, x, y, 'orizzontale', puzzle);
    verificaSequenza(griglia, x, y, 'verticale', puzzle);
  }
}

// Controlla la sequenza di celle contigue (in `direzione`) che parte da (x,y). Una sequenza di
// UNA sola cella non è una fusione (è una cella che appartiene solo all'altra direzione, caso
// normalissimo per qualunque cella non-intersezione): si controlla solo da lunghezza 2 in su,
// dove ogni cella deve appartenere alla STESSA parola in quella direzione.
function verificaSequenza(
  griglia: Map<string, { lettera: string; parole: number[] }>,
  x: number,
  y: number,
  direzione: DirezioneParola,
  puzzle: CrosswordPuzzle
): void {
  const precedente = direzione === 'orizzontale' ? `${x - 1},${y}` : `${x},${y - 1}`;
  if (griglia.has(precedente)) return; // non è l'inizio della sequenza, verrà controllata da lì

  const sequenza: [number, number][] = [];
  let cursore = direzione === 'orizzontale' ? x : y;
  while (true) {
    const cx = direzione === 'orizzontale' ? cursore : x;
    const cy = direzione === 'orizzontale' ? y : cursore;
    if (!griglia.has(`${cx},${cy}`)) break;
    sequenza.push([cx, cy]);
    cursore++;
  }
  if (sequenza.length < 2) return;

  let idAtteso: number | null = null;
  for (const [cx, cy] of sequenza) {
    const idx = puzzle.parole.findIndex(
      (p) =>
        p.direzione === direzione &&
        (direzione === 'orizzontale'
          ? p.y === cy && p.x <= cx && cx < p.x + p.risposta.length
          : p.x === cx && p.y <= cy && cy < p.y + p.risposta.length)
    );
    if (idx === -1) throw new Error(`Cella (${cx},${cy}) occupata ma non coperta da alcuna parola ${direzione}`);
    if (idAtteso === null) idAtteso = idx;
    else if (idx !== idAtteso) throw new Error(`Fusione illecita di parole in sequenza ${direzione} a partire da (${x},${y})`);
  }
}

export function generaPuzzleDelGiorno(oggi: Date, puzzleFallback: CrosswordPuzzle): CrosswordPuzzle {
  const tier = tierDifficolta(oggi);

  for (let tentativo = 0; tentativo < MAX_TENTATIVI; tentativo++) {
    const rng = creaRngGiornaliero(oggi, `crossword:retry${tentativo}`);
    try {
      const piazzate = tentaPiazzamento(rng, tier);
      if (piazzate.length < MINIMO_PAROLE) continue;
      const puzzle = costruisciPuzzle(piazzate, oggi);
      validaPuzzle(puzzle);
      return puzzle;
    } catch {
      continue;
    }
  }

  return puzzleFallback;
}
