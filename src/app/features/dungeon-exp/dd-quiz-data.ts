// Dati puri del primo minigioco del Dungeon EXP Hub. Le domande sono generate proceduralmente
// da procedural/quiz-templates.ts (tabelle D&D + template parametrici, seedati sul giorno
// locale): a differenza dei 4 set statici che c'erano prima, il contenuto non si ripete mai in
// un pattern fisso, mentre la difficoltà segue comunque un ciclo a 4 giorni (tierDifficolta in
// daily-rotation.ts) condiviso con cruciverba e Dungeon Run.

import { generaDomandeDelGiorno } from './procedural/quiz-templates';

export interface Domanda {
  testo: string;
  opzioni: string[];
  corretta: number;
}

export function domandeDelGiorno(oggi: Date = new Date()): Domanda[] {
  return generaDomandeDelGiorno(oggi);
}
