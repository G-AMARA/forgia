// Dati puri (nessun import di Phaser) condivisi fra il componente Angular (dungeon-run.ts,
// per la schermata di selezione classe/HUD) e la scena Phaser (dungeon-run-scene.ts, per la
// logica di gioco). Separati dalla scena apposta: se il componente importasse CLASSI_DND
// direttamente da dungeon-run-scene.ts, trascinerebbe con sé anche il suo "import Phaser"
// statico, caricando l'intera libreria non appena si apre il minigioco invece che solo
// dopo la scelta della classe (unico punto in cui avviaGioco() fa l'import() dinamico).

export const NUMERO_GEMME_TOTALI = 10;

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
