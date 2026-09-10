// Dati puri del primo minigioco del Dungeon EXP Hub. Prima le domande erano un unico array
// statico senza alcuna rotazione: lo stesso identico quiz ogni giorno, per sempre. Qui invece
// più set di 5 domande ruotano a mezzanotte locale (stesso meccanismo di
// dnd-crossword-data.ts, vedi daily-rotation.ts), come per il cruciverba.

import { indiceGiornoLocale } from './daily-rotation';

export interface Domanda {
  testo: string;
  opzioni: string[];
  corretta: number;
}

const SET_1: Domanda[] = [
  {
    testo: 'Quale tipo di danno è spesso il più efficace contro i non-morti?',
    opzioni: ['Radiante', 'Necrotico', 'Psichico', 'Tuono'],
    corretta: 0,
  },
  {
    testo: "Come si chiama il piano d'ombra usato per viaggi rapidi tra le distanze?",
    opzioni: ['Piano Etereo', 'Piano Ombra', 'Abisso', 'Limbo'],
    corretta: 1,
  },
  {
    testo: "Quale classe intrattiene un patto con un'entità extraplanare per i suoi poteri?",
    opzioni: ['Mago', 'Chierico', 'Warlock', 'Bardo'],
    corretta: 2,
  },
  {
    testo: 'Qual è il dado di danno di una Spada Lunga impugnata a due mani?',
    opzioni: ['1d6', '1d8', '1d10', '1d12'],
    corretta: 2,
  },
  {
    testo: 'Quale caratteristica determina i punti ferita massimi di un personaggio?',
    opzioni: ['Destrezza', 'Costituzione', 'Saggezza', 'Forza'],
    corretta: 1,
  },
];

const SET_2: Domanda[] = [
  {
    testo: 'Quale metallo è tradizionalmente letale per i licantropi?',
    opzioni: ['Oro', 'Argento', 'Ferro', 'Platino'],
    corretta: 1,
  },
  {
    testo: 'Come si chiama il piano natio dei demoni nel multiverso di D&D?',
    opzioni: ['Abisso', 'Nirvana', 'Limbo', 'Piano Ombra'],
    corretta: 0,
  },
  {
    testo: 'Quale caratteristica è più importante per un Ladro esperto di furtività?',
    opzioni: ['Forza', 'Destrezza', 'Intelligenza', 'Carisma'],
    corretta: 1,
  },
  {
    testo: 'Quale dado vita usa tipicamente un Barbaro?',
    opzioni: ['d6', 'd8', 'd10', 'd12'],
    corretta: 3,
  },
  {
    testo: 'Come si chiama l\'incantesimo che riporta in vita un caduto?',
    opzioni: ['Guarigione', 'Rianimazione', 'Resurrezione', 'Cura Ferite'],
    corretta: 2,
  },
];

const SET_3: Domanda[] = [
  {
    testo: 'Quale creatura è nota per pietrificare con lo sguardo?',
    opzioni: ['Beholder', 'Basilisco', 'Idra', 'Manticora'],
    corretta: 1,
  },
  {
    testo: "Quale scuola di magia include l'incantesimo Palla di Fuoco?",
    opzioni: ['Necromanzia', 'Evocazione', 'Ammaliamento', 'Illusione'],
    corretta: 1,
  },
  {
    testo: 'Quale arma è tradizionalmente associata ai Paladini che venerano la giustizia?',
    opzioni: ['Pugnale', 'Spada Lunga', 'Frusta', 'Fionda'],
    corretta: 1,
  },
  {
    testo: 'Cosa succede tipicamente ai dadi danno su un colpo critico?',
    opzioni: ['Vengono raddoppiati', 'Si aggiunge +10 fisso', 'Si tira due volte il d20', 'Niente, è automatico'],
    corretta: 0,
  },
  {
    testo: 'Quale incantesimo di 1° livello permette di parlare con gli animali?',
    opzioni: ['Parlare con gli Animali', 'Ammaliare Persone', 'Linguaggi', 'Comunione'],
    corretta: 0,
  },
];

const SET_4: Domanda[] = [
  {
    testo: 'Quale razza è nota per la resistenza al veleno e la vita sotterranea?',
    opzioni: ['Elfo', 'Nano', 'Halfling', 'Mezzelfo'],
    corretta: 1,
  },
  {
    testo: "Come si chiama la valuta d'oro standard di D&D?",
    opzioni: ["Marco d'oro", 'Corona', "Pezzo d'oro", 'Ducato'],
    corretta: 2,
  },
  {
    testo: 'Quale non-morto è spesso un incantatore e custodisce un phylactery?',
    opzioni: ['Zombie', 'Scheletro', 'Lich', 'Spettro'],
    corretta: 2,
  },
  {
    testo: 'Quale competenza usi tipicamente per notare una trappola nascosta?',
    opzioni: ['Percezione', 'Furtività', 'Atletica', 'Intimidire'],
    corretta: 0,
  },
  {
    testo: 'Qual è il dado di danno base di una Balestra Leggera?',
    opzioni: ['1d4', '1d6', '1d8', '1d10'],
    corretta: 2,
  },
];

// Set rotativo: un pool di 5 domande diverso per ogni giorno di calendario (mezzanotte
// locale, vedi indiceGiornoLocale in daily-rotation.ts), a ciclo dopo 4 giorni.
export const SET_DOMANDE_DND: Domanda[][] = [SET_1, SET_2, SET_3, SET_4];

export function domandeDelGiorno(oggi: Date = new Date()): Domanda[] {
  return SET_DOMANDE_DND[indiceGiornoLocale(oggi) % SET_DOMANDE_DND.length];
}
