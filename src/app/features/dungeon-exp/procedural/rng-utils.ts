// Utility generiche sopra un PRNG (creaRngGiornaliero, vedi daily-rotation.ts), riusate dai
// 3 generatori procedurali del Dungeon EXP Hub. Nessuna logica di dominio qui dentro.

export type Rng = () => number;

export function rngInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function rngPick<T>(array: readonly T[], rng: Rng): T {
  return array[rngInt(rng, 0, array.length - 1)];
}

export function rngPickPesato<T>(array: readonly T[], rng: Rng, peso: (t: T) => number): T {
  const pesi = array.map((elemento) => Math.max(peso(elemento), 0.0001));
  const totale = pesi.reduce((somma, p) => somma + p, 0);
  let soglia = rng() * totale;
  for (let i = 0; i < array.length; i++) {
    soglia -= pesi[i];
    if (soglia <= 0) return array[i];
  }
  return array[array.length - 1];
}

export function rngShuffle<T>(array: readonly T[], rng: Rng): T[] {
  const risultato = [...array];
  for (let i = risultato.length - 1; i > 0; i--) {
    const j = rngInt(rng, 0, i);
    [risultato[i], risultato[j]] = [risultato[j], risultato[i]];
  }
  return risultato;
}

export function rngPickN<T>(array: readonly T[], n: number, rng: Rng): T[] {
  return rngShuffle(array, rng).slice(0, n);
}

export function arrotondaAMultiplo(valore: number, multiplo: number): number {
  return Math.max(multiplo, Math.round(valore / multiplo) * multiplo);
}
