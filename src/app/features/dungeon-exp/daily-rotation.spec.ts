import { creaRngGiornaliero, tierDifficolta } from './daily-rotation';

const GIORNO_BASE = new Date(2026, 0, 1);
const giorno = (offset: number) => new Date(GIORNO_BASE.getTime() + offset * 86_400_000);

describe('tierDifficolta', () => {
  it('cicla su un periodo di 4 giorni, in ordine', () => {
    const partenza = tierDifficolta(giorno(0));
    const attesi = Array.from({ length: 8 }, (_, i) => ((partenza + i) % 4) as 0 | 1 | 2 | 3);
    const ottenuti = attesi.map((_, i) => tierDifficolta(giorno(i)));
    expect(ottenuti).toEqual(attesi);
  });
});

describe('creaRngGiornaliero', () => {
  it('è deterministico per la stessa coppia (giorno, salt)', () => {
    const sequenzaA = Array.from({ length: 5 }, () => 0).map((_, i) => i);
    const rng1 = creaRngGiornaliero(giorno(10), 'quiz');
    const rng2 = creaRngGiornaliero(giorno(10), 'quiz');
    const valori1 = sequenzaA.map(() => rng1());
    const valori2 = sequenzaA.map(() => rng2());
    expect(valori1).toEqual(valori2);
  });

  it('produce sequenze diverse per salt diversi nello stesso giorno', () => {
    const rngQuiz = creaRngGiornaliero(giorno(10), 'quiz');
    const rngCrossword = creaRngGiornaliero(giorno(10), 'crossword');
    const valoriQuiz = Array.from({ length: 5 }, () => rngQuiz());
    const valoriCrossword = Array.from({ length: 5 }, () => rngCrossword());
    expect(valoriQuiz).not.toEqual(valoriCrossword);
  });

  it('produce sequenze diverse per giorni diversi con lo stesso salt', () => {
    const rngGiorno1 = creaRngGiornaliero(giorno(1), 'quiz');
    const rngGiorno2 = creaRngGiornaliero(giorno(2), 'quiz');
    expect(rngGiorno1()).not.toEqual(rngGiorno2());
  });
});
