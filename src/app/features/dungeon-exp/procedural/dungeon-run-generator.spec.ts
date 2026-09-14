import { generaLivelloDelGiorno } from './dungeon-run-generator';
import { NUMERO_GEMME_TOTALI, TIER_ALTO, TIER_BASSO, TILE_DUNGEON, type LivelloDungeon } from '../dungeon-run-data';

const GIORNI_SIMULATI = 500;
const GIORNO_BASE = new Date(2026, 0, 1);
const giorno = (offset: number) => new Date(GIORNO_BASE.getTime() + offset * 86_400_000);

const LIVELLO_FALLBACK: LivelloDungeon = {
  nome: 'Fallback di test',
  larghezzaMondo: 2600,
  durataSecondi: 75,
  segmentiTerreno: [{ x: 0, larghezza: 680 }],
  piattaforme: [],
  posizioniSpine: [],
  posizioniNemici: [],
  posizioniGemme: Array.from({ length: NUMERO_GEMME_TOTALI }, (_, i) => ({ x: i * 100, y: 350 })),
  forziereX: 600,
};

describe('generaLivelloDelGiorno', () => {
  it(`rispetta tutti gli invarianti fisici su ${GIORNI_SIMULATI} giorni simulati`, () => {
    for (let i = 0; i < GIORNI_SIMULATI; i++) {
      const livello = generaLivelloDelGiorno(giorno(i), LIVELLO_FALLBACK);

      // Ogni pozzo (gap fra segmenti consecutivi) resta esattamente 80px: garanzia di
      // superabilità, mai un range casuale.
      for (let s = 0; s < livello.segmentiTerreno.length - 1; s++) {
        const gap =
          livello.segmentiTerreno[s + 1].x - (livello.segmentiTerreno[s].x + livello.segmentiTerreno[s].larghezza);
        expect(gap).toBe(80);
      }

      for (const segmento of livello.segmentiTerreno) {
        expect(segmento.larghezza % TILE_DUNGEON).toBe(0);
      }
      for (const piattaforma of livello.piattaforme) {
        expect(piattaforma.larghezza % TILE_DUNGEON).toBe(0);
      }

      const piattaformeBasse = livello.piattaforme.filter((p) => p.y === TIER_BASSO);
      for (const alta of livello.piattaforme.filter((p) => p.y === TIER_ALTO)) {
        const collegata = piattaformeBasse.some(
          (bassa) => bassa.x + bassa.larghezza + 40 === alta.x || alta.x + alta.larghezza + 40 === bassa.x
        );
        expect(collegata).toBe(true);
      }

      expect(livello.posizioniGemme).toHaveLength(NUMERO_GEMME_TOTALI);

      const tutteLeX = [
        ...livello.segmentiTerreno.map((s) => s.x + s.larghezza),
        ...livello.piattaforme.map((p) => p.x + p.larghezza),
        ...livello.posizioniNemici.map((n) => n.x),
        ...livello.posizioniSpine.map((s) => s.x),
        ...livello.posizioniGemme.map((g) => g.x),
        livello.forziereX,
      ];
      for (const x of tutteLeX) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(livello.larghezzaMondo);
      }

      const forziereSuTerreno = livello.segmentiTerreno.some(
        (s) => livello.forziereX >= s.x && livello.forziereX <= s.x + s.larghezza
      );
      expect(forziereSuTerreno).toBe(true);
    }
  });

  it('è deterministico per lo stesso giorno', () => {
    const oggi = giorno(42);
    expect(generaLivelloDelGiorno(oggi, LIVELLO_FALLBACK)).toEqual(generaLivelloDelGiorno(oggi, LIVELLO_FALLBACK));
  });
});
