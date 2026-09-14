import { generaDomandeDelGiorno } from './quiz-templates';

const GIORNI_SIMULATI = 500;
const GIORNO_BASE = new Date(2026, 0, 1);
const giorno = (offset: number) => new Date(GIORNO_BASE.getTime() + offset * 86_400_000);

describe('generaDomandeDelGiorno', () => {
  it(`genera sempre 5 domande valide su ${GIORNI_SIMULATI} giorni simulati`, () => {
    const testiVisti = new Set<string>();

    for (let i = 0; i < GIORNI_SIMULATI; i++) {
      const domande = generaDomandeDelGiorno(giorno(i));
      expect(domande).toHaveLength(5);

      const testiDelGiorno = new Set<string>();
      for (const domanda of domande) {
        expect(domanda.opzioni).toHaveLength(4);
        expect(new Set(domanda.opzioni).size).toBe(4);
        expect(domanda.corretta).toBeGreaterThanOrEqual(0);
        expect(domanda.corretta).toBeLessThan(4);
        expect(testiDelGiorno.has(domanda.testo)).toBe(false);
        testiDelGiorno.add(domanda.testo);
        testiVisti.add(domanda.testo);
      }
    }

    // Copertura: molte più combinazioni distinte dei vecchi 4 set × 5 domande fisse (20 totali).
    // Il tetto reale è la somma delle righe di tutte le tabelle (~87 con quelle attuali in
    // quiz-tabelle.ts): la soglia resta sotto quel tetto per non essere fragile se si aggiunge
    // qualche riga in futuro.
    expect(testiVisti.size).toBeGreaterThan(60);
  });

  it('è deterministico per lo stesso giorno', () => {
    const oggi = giorno(42);
    expect(generaDomandeDelGiorno(oggi)).toEqual(generaDomandeDelGiorno(oggi));
  });
});
