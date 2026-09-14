// Algoritmo di generazione del quiz: pesca 5 template distinti, per ciascuno sceglie la riga
// "corretta" pesando verso il tier di difficoltà del giorno e costruisce 3 distrattori dalla
// stessa tabella. Sostituisce i 4 set statici fissi di dd-quiz-data.ts.

import { creaRngGiornaliero, tierDifficolta } from '../daily-rotation';
import { rngPickN, rngPickPesato, rngShuffle, type Rng } from './rng-utils';
import {
  TABELLA_ABILITA,
  TABELLA_ARMI,
  TABELLA_CLASSI,
  TABELLA_CREATURE,
  TABELLA_INCANTESIMI,
  TABELLA_PIANI,
} from './quiz-tabelle';
import type { Domanda } from '../dd-quiz-data';

interface RigaBase {
  tier: 0 | 1 | 2 | 3;
}

// Pesca la riga "corretta" privilegiando le righe con tier vicino a quello del giorno: a
// tier 0 il quiz resta sulle nozioni più note, a tier 3 pesca più spesso nel materiale di nicchia.
function pescaRigaPerTier<T extends RigaBase>(tabella: readonly T[], tier: number, rng: Rng): T {
  return rngPickPesato(tabella, rng, (riga) => 1 / (1 + Math.abs(riga.tier - tier)));
}

// Distrattori: altre righe della stessa tabella con un VALORE-RISPOSTA univoco (non basta che
// la riga sia diversa, es. due classi diverse possono avere lo stesso dado vita: prendere
// entrambe come distrattori produrrebbe due opzioni testualmente identiche). Si mescola la
// tabella e si accumulano righe finché il valore non è già stato visto.
function distrattori<T extends RigaBase>(
  tabella: readonly T[],
  corretta: T,
  valoreRisposta: (r: T) => string,
  rng: Rng,
  n: number
): T[] {
  const valoriVisti = new Set([valoreRisposta(corretta)]);
  const risultato: T[] = [];
  for (const riga of rngShuffle(tabella, rng)) {
    const valore = valoreRisposta(riga);
    if (valoriVisti.has(valore)) continue;
    valoriVisti.add(valore);
    risultato.push(riga);
    if (risultato.length === n) break;
  }
  return risultato;
}

function costruisciDomanda<T extends RigaBase>(
  tabella: readonly T[],
  tier: number,
  rng: Rng,
  testo: (riga: T) => string,
  valoreRisposta: (riga: T) => string
): Domanda {
  const corretta = pescaRigaPerTier(tabella, tier, rng);
  const distrattoriRighe = distrattori(tabella, corretta, valoreRisposta, rng, 3);
  const opzioniRighe = rngShuffle([corretta, ...distrattoriRighe], rng);

  return {
    testo: testo(corretta),
    opzioni: opzioniRighe.map(valoreRisposta),
    corretta: opzioniRighe.indexOf(corretta),
  };
}

type CostruttoreTemplate = (tier: number, rng: Rng) => Domanda;

// Template "critico": non pesca da una tabella, ma è comunque parametrico su un pool di
// formulazioni sbagliate mescolate a rotazione, per varietà nell'ordine delle opzioni.
// La risposta corretta è quella già rivista in questa sessione: raddoppiano i DADI, non il
// totale del danno.
function domandaCritico(_tier: number, rng: Rng): Domanda {
  const opzioniRighe = rngShuffle(
    [
      { corretta: true, testo: 'Il numero di dadi raddoppia (non il totale)' },
      { corretta: false, testo: 'Si aggiunge +10 fisso' },
      { corretta: false, testo: 'Si tira due volte il d20' },
      { corretta: false, testo: 'Niente, è automatico' },
    ],
    rng
  );

  return {
    testo: 'Cosa succede tipicamente ai dadi danno su un colpo critico?',
    opzioni: opzioniRighe.map((o) => o.testo),
    corretta: opzioniRighe.findIndex((o) => o.corretta),
  };
}

const TEMPLATES: CostruttoreTemplate[] = [
  (tier, rng) =>
    costruisciDomanda(
      TABELLA_CLASSI,
      tier,
      rng,
      (r) => `Quale dado vita usa tipicamente un ${r.nome}?`,
      (r) => r.dadoVita
    ),
  (tier, rng) =>
    costruisciDomanda(
      TABELLA_ARMI,
      tier,
      rng,
      (r) => `Qual è il dado di danno base di ${r.nome}?`,
      (r) => r.dadoDanno
    ),
  (tier, rng) =>
    costruisciDomanda(
      TABELLA_INCANTESIMI,
      tier,
      rng,
      (r) => `A quale scuola di magia appartiene l'incantesimo ${r.nome}?`,
      (r) => r.scuola
    ),
  (tier, rng) =>
    costruisciDomanda(
      TABELLA_CREATURE,
      tier,
      rng,
      (r) => `Qual è la debolezza nota di: ${r.nome}?`,
      (r) => r.debolezza
    ),
  (tier, rng) =>
    costruisciDomanda(
      TABELLA_PIANI,
      tier,
      rng,
      (r) => `Come si chiama il piano descritto da: "${r.descrizioneBreve}"?`,
      (r) => r.nome
    ),
  (tier, rng) =>
    costruisciDomanda(
      TABELLA_ABILITA,
      tier,
      rng,
      (r) => `Quale caratteristica governa la prova di ${r.nome}?`,
      (r) => r.caratteristica
    ),
  domandaCritico,
];

const NUMERO_DOMANDE = 5;

export function generaDomandeDelGiorno(oggi: Date = new Date()): Domanda[] {
  const rng = creaRngGiornaliero(oggi, 'quiz');
  const tier = tierDifficolta(oggi);
  const templatesScelti = rngPickN(TEMPLATES, NUMERO_DOMANDE, rng);
  const domande = templatesScelti.map((template) => template(tier, rng));

  // Autovalidazione: 4 opzioni uniche e indice corretto valido per ogni domanda (le tabelle
  // sono scritte per non produrre mai ambiguità, ma un controllo esplicito costa poco).
  for (const domanda of domande) {
    if (new Set(domanda.opzioni).size !== domanda.opzioni.length) {
      throw new Error(`Domanda generata con opzioni duplicate: ${domanda.testo}`);
    }
    if (domanda.corretta < 0 || domanda.corretta >= domanda.opzioni.length) {
      throw new Error(`Domanda generata con indice corretta non valido: ${domanda.testo}`);
    }
  }

  return domande;
}
