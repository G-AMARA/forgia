// Tabelle ufficiali D&D 5e SRD per gli slot incantesimo, indicizzate per livello personaggio (1-20).
// Coprono solo le 8 classi incantatrici canoniche: classi homebrew con nomi diversi
// restituiscono null da getSpellcastingInfo (nessuna progressione nota per calcolarle).

export type RechargeType = 'short_rest' | 'long_rest';

export interface SpellcastingInfo {
  cantripsKnown: number;
  slots: { level: number; count: number }[];
  recharge: RechargeType;
  // Numero massimo di incantesimi (non trucchetti) conosciuti/preparabili in totale,
  // a prescindere dal loro livello. Null se la classe non ha un limite calcolabile.
  spellsKnownLimit: number | null;
}

// Mago, Stregone, Chierico, Druido, Bardo: slot per livello incantesimo 1-9.
const FULL_CASTER_SLOTS: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

// Paladino, Ranger: incantatori "mezzi", partono al livello 2, slot solo fino al 5° livello.
const HALF_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0],
  [3, 0, 0, 0, 0],
  [3, 0, 0, 0, 0],
  [4, 2, 0, 0, 0],
  [4, 2, 0, 0, 0],
  [4, 3, 0, 0, 0],
  [4, 3, 0, 0, 0],
  [4, 3, 2, 0, 0],
  [4, 3, 2, 0, 0],
  [4, 3, 3, 0, 0],
  [4, 3, 3, 0, 0],
  [4, 3, 3, 1, 0],
  [4, 3, 3, 1, 0],
  [4, 3, 3, 2, 0],
  [4, 3, 3, 2, 0],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
];

// Warlock: Pact Magic. Pochi slot ma di livello crescente, si ricaricano col riposo breve.
const WARLOCK_SLOTS: { count: number; level: number }[] = [
  { count: 1, level: 1 },
  { count: 2, level: 1 },
  { count: 2, level: 2 },
  { count: 2, level: 2 },
  { count: 2, level: 3 },
  { count: 2, level: 3 },
  { count: 2, level: 4 },
  { count: 2, level: 4 },
  { count: 2, level: 5 },
  { count: 2, level: 5 },
  { count: 3, level: 5 },
  { count: 3, level: 5 },
  { count: 3, level: 5 },
  { count: 3, level: 5 },
  { count: 3, level: 5 },
  { count: 3, level: 5 },
  { count: 4, level: 5 },
  { count: 4, level: 5 },
  { count: 4, level: 5 },
  { count: 4, level: 5 },
];

const CANTRIPS_KNOWN: Record<string, number[]> = {
  bard: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  druid: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  wizard: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
};

const FULL_CASTERS = new Set(['bard', 'cleric', 'druid', 'sorcerer', 'wizard']);
const HALF_CASTERS = new Set(['paladin', 'ranger']);

// Classi a incantesimi "conosciuti": una lista fissa di incantesimi scelti una volta per tutte
// (a differenza dei "preparati", scelti liberamente ogni giorno dall'intera lista della classe).
const KNOWN_SPELLS: Record<string, number[]> = {
  bard: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
};

// Classi a incantesimi "preparati": il limite è mod. caratteristica + livello (Paladino: metà livello,
// essendo un mezzo incantatore), minimo 1. Richiede gli ability_scores del personaggio.
const PREPARED_CASTER_ABILITY: Record<string, 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'> = {
  wizard: 'int',
  cleric: 'wis',
  druid: 'wis',
  paladin: 'cha',
};

/** Calcola slot, trucchetti e incantesimi conosciuti per una classe (nome base inglese) a un dato livello. */
export function getSpellcastingInfo(
  className: string | null | undefined,
  level: number,
  abilityScores?: Record<string, number>
): SpellcastingInfo | null {
  if (!className) return null;
  const key = className.trim().toLowerCase();
  const idx = Math.min(Math.max(level, 1), 20) - 1;

  let cantripsKnown: number;
  let slots: { level: number; count: number }[];
  let recharge: RechargeType;

  if (key === 'warlock') {
    const w = WARLOCK_SLOTS[idx];
    cantripsKnown = CANTRIPS_KNOWN['warlock'][idx];
    slots = w.count > 0 ? [{ level: w.level, count: w.count }] : [];
    recharge = 'short_rest';
  } else if (FULL_CASTERS.has(key)) {
    cantripsKnown = CANTRIPS_KNOWN[key]?.[idx] ?? 0;
    slots = FULL_CASTER_SLOTS[idx].map((count, i) => ({ level: i + 1, count })).filter((s) => s.count > 0);
    recharge = 'long_rest';
  } else if (HALF_CASTERS.has(key)) {
    cantripsKnown = CANTRIPS_KNOWN[key]?.[idx] ?? 0;
    slots = HALF_CASTER_SLOTS[idx].map((count, i) => ({ level: i + 1, count })).filter((s) => s.count > 0);
    recharge = 'long_rest';
  } else {
    return null;
  }

  let spellsKnownLimit: number | null = null;
  if (KNOWN_SPELLS[key]) {
    spellsKnownLimit = KNOWN_SPELLS[key][idx] ?? null;
  } else if (PREPARED_CASTER_ABILITY[key] && abilityScores) {
    const abilityKey = PREPARED_CASTER_ABILITY[key];
    const mod = Math.floor(((abilityScores[abilityKey] ?? 10) - 10) / 2);
    const effectiveLevel = key === 'paladin' ? Math.floor(level / 2) : level;
    spellsKnownLimit = Math.max(1, mod + effectiveLevel);
  }

  return { cantripsKnown, slots, recharge, spellsKnownLimit };
}
