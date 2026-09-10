// Dati puri (nessun import di Phaser) condivisi fra il componente Angular (dungeon-run.ts,
// per la schermata di selezione classe/HUD) e la scena Phaser (dungeon-run-scene.ts, per la
// logica di gioco). Separati dalla scena apposta: se il componente importasse CLASSI_DND
// direttamente da dungeon-run-scene.ts, trascinerebbe con sé anche il suo "import Phaser"
// statico, caricando l'intera libreria non appena si apre il minigioco invece che solo
// dopo la scelta della classe (unico punto in cui avviaGioco() fa l'import() dinamico).

import { indiceGiornoLocale } from './daily-rotation';

export const NUMERO_GEMME_TOTALI = 10;

// Costanti geometriche condivise da TUTTI i livelli (fisica del salto e quote di terreno/
// piattaforma non dipendono dal giorno, solo il PERCORSO sì): vivono qui, non nella scena
// Phaser, perché servono anche per calcolare le coordinate di LIVELLI_DUNGEON qui sotto.
export const SCALA_DUNGEON = 2.5;
export const TILE_DUNGEON = 16 * SCALA_DUNGEON; // 40
export const TERRENO_Y = 410;
export const TIER_BASSO = TERRENO_Y - 130; // 280
export const TIER_ALTO = TIER_BASSO - 100; // 180
export const ALTEZZA_MONDO = 450;
export const GIOCATORE_SPAWN_X = 80;
export const GIOCATORE_SPAWN_Y = TERRENO_Y - 100;

export interface SegmentoTerreno {
  x: number;
  larghezza: number;
}

export interface PiattaformaDungeon {
  x: number;
  y: number;
  larghezza: number;
}

export interface PosizioneNemicoDungeon {
  x: number;
  y: number;
  distanza: number;
  velocita: number;
}

export interface PosizioneStaticaDungeon {
  x: number;
  y: number;
}

export interface LivelloDungeon {
  nome: string;
  larghezzaMondo: number;
  durataSecondi: number;
  segmentiTerreno: SegmentoTerreno[];
  piattaforme: PiattaformaDungeon[];
  posizioniSpine: PosizioneStaticaDungeon[];
  posizioniNemici: PosizioneNemicoDungeon[];
  // Sempre 10 (NUMERO_GEMME_TOTALI): il limite p_gemme <= 10 della RPC award_dungeon_run_xp
  // è fisso per ogni livello, quindi ogni set qui sotto DEVE contenerne esattamente 10.
  posizioniGemme: PosizioneStaticaDungeon[];
  forziereX: number;
}

// 4 percorsi distinti, uno per giorno di calendario (mezzanotte locale, stesso meccanismo di
// SET_DOMANDE_DND/CRUCIVERBA_DND, vedi indiceGiornoLocale in daily-rotation.ts), a ciclo dopo
// 4 giorni: niente più stesso identico dungeon ogni giorno. Ogni livello è più impegnativo del
// precedente (più pozzi, più nemici e più veloci, più piattaforme in quota, più spine, timer
// più corto, mappa più lunga), ma tutti i pozzi restano larghi 80px (2 tegole) come nel livello
// originale: con FORZA_SALTO/gravità di dungeon-run-scene.ts un salto in corsa copre ~220px
// in orizzontale, quindi anche il livello più duro resta superabile al primo tentativo. Stesso
// discorso per il gap fra una piattaforma TIER_BASSO e la TIER_ALTO adiacente da cui rilanciarsi
// (~40px, mai isolata): vedi il commento originale, qui riapplicato identico su ogni coppia.
const LIVELLO_1: LivelloDungeon = {
  nome: "L'Ingresso della Cripta",
  larghezzaMondo: 2600,
  durataSecondi: 75,
  segmentiTerreno: [
    { x: 0, larghezza: 680 },
    { x: 760, larghezza: 600 },
    { x: 1440, larghezza: 520 },
    { x: 2040, larghezza: 560 },
  ],
  piattaforme: [
    { x: 300, y: TIER_BASSO, larghezza: 160 },
    { x: 1000, y: TIER_BASSO, larghezza: 160 },
    { x: 1700, y: TIER_BASSO, larghezza: 160 },
  ],
  posizioniSpine: [{ x: 1150, y: TERRENO_Y - TILE_DUNGEON / 2 }],
  posizioniNemici: [
    { x: 350, y: TERRENO_Y - 60, distanza: 150, velocita: 50 },
    { x: 1050, y: TERRENO_Y - 60, distanza: 120, velocita: 50 },
    { x: 1650, y: TERRENO_Y - 60, distanza: 150, velocita: 50 },
  ],
  posizioniGemme: [
    { x: 300, y: TIER_BASSO - 60 },
    { x: 500, y: TERRENO_Y - 60 },
    { x: 900, y: TERRENO_Y - 60 },
    { x: 1000, y: TIER_BASSO - 60 },
    { x: 1250, y: TERRENO_Y - 60 },
    { x: 1550, y: TERRENO_Y - 60 },
    { x: 1700, y: TIER_BASSO - 60 },
    { x: 1900, y: TERRENO_Y - 60 },
    { x: 2150, y: TERRENO_Y - 60 },
    { x: 2400, y: TERRENO_Y - 60 },
  ],
  forziereX: 2520,
};

const LIVELLO_2: LivelloDungeon = {
  nome: 'I Corridoi del Custode',
  larghezzaMondo: 2900,
  durataSecondi: 65,
  segmentiTerreno: [
    { x: 0, larghezza: 600 },
    { x: 680, larghezza: 480 },
    { x: 1240, larghezza: 440 },
    { x: 1760, larghezza: 460 },
    { x: 2300, larghezza: 600 },
  ],
  piattaforme: [
    { x: 260, y: TIER_BASSO, larghezza: 160 },
    { x: 820, y: TIER_BASSO, larghezza: 140 }, // gap 40px dalla successiva (TIER_ALTO)
    { x: 1000, y: TIER_ALTO, larghezza: 100 },
    { x: 1350, y: TIER_BASSO, larghezza: 160 },
    { x: 1850, y: TIER_BASSO, larghezza: 160 },
    { x: 2450, y: TIER_BASSO, larghezza: 200 },
  ],
  posizioniSpine: [
    { x: 900, y: TERRENO_Y - TILE_DUNGEON / 2 },
    { x: 2000, y: TERRENO_Y - TILE_DUNGEON / 2 },
  ],
  posizioniNemici: [
    { x: 300, y: TERRENO_Y - 60, distanza: 150, velocita: 55 },
    { x: 830, y: TIER_BASSO - 60, distanza: 60, velocita: 55 },
    { x: 1450, y: TERRENO_Y - 60, distanza: 120, velocita: 60 },
    { x: 1950, y: TERRENO_Y - 60, distanza: 120, velocita: 65 },
    { x: 2600, y: TERRENO_Y - 60, distanza: 150, velocita: 65 },
  ],
  posizioniGemme: [
    { x: 260, y: TIER_BASSO - 60 },
    { x: 460, y: TERRENO_Y - 60 },
    { x: 830, y: TIER_BASSO - 60 },
    { x: 1050, y: TIER_ALTO - 60 },
    { x: 1350, y: TIER_BASSO - 60 },
    { x: 1550, y: TERRENO_Y - 60 },
    { x: 1850, y: TIER_BASSO - 60 },
    { x: 2100, y: TERRENO_Y - 60 },
    { x: 2450, y: TIER_BASSO - 60 },
    { x: 2700, y: TERRENO_Y - 60 },
  ],
  forziereX: 2820,
};

// Percorso ORIGINALE del minigioco, invariato: vedi la nota architetturale nei commenti di
// dungeon-run-scene.ts per i vincoli di sicurezza (pozzi 80px, coppie TIER_BASSO/TIER_ALTO a
// ~40-80px) già verificati su questo layout — riusato identico per non introdurne di nuovi.
const LIVELLO_3: LivelloDungeon = {
  nome: 'Le Segrete del Custode',
  larghezzaMondo: 3200,
  durataSecondi: 60,
  segmentiTerreno: [
    { x: 0, larghezza: 640 },
    { x: 720, larghezza: 520 },
    { x: 1320, larghezza: 360 },
    { x: 1760, larghezza: 480 },
    { x: 2320, larghezza: 880 },
  ],
  piattaforme: [
    { x: 280, y: TIER_BASSO, larghezza: 160 },
    { x: 480, y: TIER_ALTO, larghezza: 120 },
    { x: 800, y: TIER_BASSO, larghezza: 160 },
    { x: 1040, y: TIER_ALTO, larghezza: 120 },
    { x: 1400, y: TIER_BASSO, larghezza: 160 },
    { x: 1800, y: TIER_BASSO, larghezza: 160 },
    { x: 2050, y: TIER_BASSO, larghezza: 160 },
    { x: 2500, y: TIER_BASSO, larghezza: 200 },
  ],
  posizioniSpine: [
    { x: 900, y: TERRENO_Y - TILE_DUNGEON / 2 },
    { x: 1900, y: TERRENO_Y - TILE_DUNGEON / 2 },
    { x: 2600, y: TERRENO_Y - TILE_DUNGEON / 2 },
  ],
  posizioniNemici: [
    { x: 350, y: TERRENO_Y - 60, distanza: 150, velocita: 60 },
    { x: 800, y: TIER_BASSO - 60, distanza: 60, velocita: 60 },
    { x: 1500, y: TERRENO_Y - 60, distanza: 120, velocita: 60 },
    { x: 1880, y: TIER_BASSO - 60, distanza: 60, velocita: 60 },
    { x: 2600, y: TERRENO_Y - 60, distanza: 180, velocita: 60 },
    { x: 2950, y: TERRENO_Y - 60, distanza: 100, velocita: 60 },
  ],
  posizioniGemme: [
    { x: 280, y: TIER_BASSO - 60 },
    { x: 540, y: TIER_ALTO - 60 },
    { x: 550, y: TERRENO_Y - 60 },
    { x: 800, y: TIER_BASSO - 60 },
    { x: 1100, y: TIER_ALTO - 60 },
    { x: 1450, y: TIER_BASSO - 60 },
    { x: 1880, y: TIER_BASSO - 60 },
    { x: 2130, y: TIER_BASSO - 60 },
    { x: 2600, y: TIER_BASSO - 60 },
    { x: 2900, y: TERRENO_Y - 60 },
  ],
  forziereX: 3120,
};

const LIVELLO_4: LivelloDungeon = {
  nome: 'Il Cuore Oscuro del Dungeon',
  larghezzaMondo: 3500,
  durataSecondi: 50,
  segmentiTerreno: [
    { x: 0, larghezza: 560 },
    { x: 640, larghezza: 440 },
    { x: 1160, larghezza: 360 },
    { x: 1600, larghezza: 400 },
    { x: 2080, larghezza: 440 },
    { x: 2600, larghezza: 900 },
  ],
  piattaforme: [
    { x: 250, y: TIER_BASSO, larghezza: 140 },
    { x: 430, y: TIER_ALTO, larghezza: 100 }, // gap 40px da platform1
    { x: 700, y: TIER_BASSO, larghezza: 120 },
    { x: 860, y: TIER_ALTO, larghezza: 100 }, // gap 40px da platform3
    { x: 1180, y: TIER_BASSO, larghezza: 160 },
    { x: 1650, y: TIER_BASSO, larghezza: 160 },
    { x: 1850, y: TIER_ALTO, larghezza: 100 }, // gap 40px da platform6
    { x: 2120, y: TIER_BASSO, larghezza: 160 },
    { x: 2650, y: TIER_BASSO, larghezza: 160 },
    { x: 2950, y: TIER_BASSO, larghezza: 200 },
  ],
  posizioniSpine: [
    { x: 900, y: TERRENO_Y - TILE_DUNGEON / 2 },
    { x: 1750, y: TERRENO_Y - TILE_DUNGEON / 2 },
    { x: 2300, y: TERRENO_Y - TILE_DUNGEON / 2 },
    { x: 3100, y: TERRENO_Y - TILE_DUNGEON / 2 },
  ],
  posizioniNemici: [
    { x: 280, y: TERRENO_Y - 60, distanza: 130, velocita: 75 },
    { x: 740, y: TIER_BASSO - 60, distanza: 40, velocita: 70 },
    { x: 960, y: TERRENO_Y - 60, distanza: 100, velocita: 75 },
    { x: 1300, y: TERRENO_Y - 60, distanza: 130, velocita: 80 },
    { x: 1700, y: TIER_BASSO - 60, distanza: 40, velocita: 75 },
    { x: 1900, y: TERRENO_Y - 60, distanza: 90, velocita: 80 },
    { x: 2300, y: TERRENO_Y - 60, distanza: 130, velocita: 85 },
    { x: 3000, y: TERRENO_Y - 60, distanza: 180, velocita: 90 },
  ],
  posizioniGemme: [
    { x: 250, y: TIER_BASSO - 60 },
    { x: 470, y: TIER_ALTO - 60 },
    { x: 520, y: TERRENO_Y - 60 },
    { x: 740, y: TIER_BASSO - 60 },
    { x: 900, y: TIER_ALTO - 60 },
    { x: 1300, y: TERRENO_Y - 60 },
    { x: 1700, y: TIER_BASSO - 60 },
    { x: 1900, y: TIER_ALTO - 60 },
    { x: 2300, y: TERRENO_Y - 60 },
    { x: 3000, y: TERRENO_Y - 60 },
  ],
  forziereX: 3420,
};

export const LIVELLI_DUNGEON: LivelloDungeon[] = [LIVELLO_1, LIVELLO_2, LIVELLO_3, LIVELLO_4];

export function livelloDelGiorno(oggi: Date = new Date()): LivelloDungeon {
  return LIVELLI_DUNGEON[indiceGiornoLocale(oggi) % LIVELLI_DUNGEON.length];
}

export type ClasseId = 'mago' | 'guerriero';

export interface ClasseDnD {
  id: ClasseId;
  nome: string;
  icona: string;
  // Anteprima statica per la card di selezione (dungeon-run.html): un <img> semplice, non
  // un'animazione Phaser. Deve restare sincronizzata a mano con SPRITE_PERSONAGGIO in
  // dungeon-run-scene.ts se lo sprite di una classe cambia (file diversi per scopi diversi:
  // qui è solo un'immagine statica in un componente Angular, là un set di frame animati).
  spritePreview: string;
  descrizioneClasse: string;
  abilita: string;
  descrizioneAbilita: string;
  cooldownMs: number;
}

// Solo 2 classi selezionabili (vedi dungeon-run.html per la UI a 2 schede grandi).
export const CLASSI_DND: ClasseDnD[] = [
  {
    id: 'mago',
    nome: 'Mago',
    icona: '🧙',
    spritePreview: 'dungeon-run/frames/wizzard_m_idle_anim_f0.png',
    descrizioneClasse: 'Utente di magia arcana.',
    abilita: 'Palla di Fuoco',
    descrizioneAbilita: 'Un proiettile fiammeggiante che incenerisce i nemici sul percorso.',
    cooldownMs: 3000,
  },
  {
    id: 'guerriero',
    nome: 'Guerriero',
    icona: '🛡️',
    spritePreview: 'dungeon-run/frames/knight_f_idle_anim_f0.png',
    descrizioneClasse: 'Guerriero sacro in armatura pesante.',
    abilita: 'Attacco Fendente',
    descrizioneAbilita: 'Un rapido e potente colpo di spada a corto raggio.',
    cooldownMs: 3500,
  },
];

export interface DungeonRunCallbacks {
  onGemCollected: (totaleRaccolte: number) => void;
  onCooldownUpdate: (prontezza: number) => void;
  onTimerUpdate: (secondiRimanenti: number) => void;
  onGameEnd: (risultato: { vittoria: boolean; gemme: number; tempoScaduto: boolean }) => void;
}

export interface DungeonRunInitData {
  classeId: ClasseId;
  callbacks: DungeonRunCallbacks;
}
