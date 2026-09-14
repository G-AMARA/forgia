// Dati puri (nessun import di Phaser) condivisi fra il componente Angular (dungeon-run.ts,
// per la schermata di selezione classe/HUD) e la scena Phaser (dungeon-run-scene.ts, per la
// logica di gioco). Separati dalla scena apposta: se il componente importasse CLASSI_DND
// direttamente da dungeon-run-scene.ts, trascinerebbe con sé anche il suo "import Phaser"
// statico, caricando l'intera libreria non appena si apre il minigioco invece che solo
// dopo la scelta della classe (unico punto in cui avviaGioco() fa l'import() dinamico).

import { generaLivelloDelGiorno } from './procedural/dungeon-run-generator';

export const NUMERO_GEMME_TOTALI = 10;

// Costanti geometriche condivise da TUTTI i livelli (fisica del salto e quote di terreno/
// piattaforma non dipendono dal giorno, solo il PERCORSO sì): vivono qui, non nella scena
// Phaser, perché servono anche al generatore procedurale (procedural/dungeon-run-generator.ts).
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

// Percorso originale del minigioco: oggi i livelli sono generati proceduralmente da
// procedural/dungeon-run-generator.ts (contenuto sempre diverso, difficoltà a ciclo di 4
// giorni via tierDifficolta), ma questo layout — validato a mano — resta come unico fallback
// statico se il generatore non riesce a produrre un livello valido entro i tentativi previsti.
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

// LIVELLO_1 resta come unico fallback statico: se il generatore procedurale (vedi
// procedural/dungeon-run-generator.ts) esaurisce tutti i tentativi senza produrre un livello
// che passa validaLivello(), questo layout — già verificato a mano — viene usato al suo posto.
export function livelloDelGiorno(oggi: Date = new Date()): LivelloDungeon {
  return generaLivelloDelGiorno(oggi, LIVELLO_1);
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
  // `unknown` invece di DungeonRunScene: questo file NON deve importare Phaser (vedi nota in
  // testa a dungeon-run-scene.ts), il componente Angular fa il cast dopo aver ricevuto la
  // scena. Serve perché scene.add(..., true, ...) è asincrono rispetto al boot del gioco:
  // subito dopo scene.add() game.scene.getScene() restituisce ancora null, quindi la scena
  // si comunica da sé (a create() completata) invece di farsela "andare a prendere" da fuori.
  onSceneReady: (scene: unknown) => void;
}

export interface DungeonRunInitData {
  classeId: ClasseId;
  callbacks: DungeonRunCallbacks;
}
