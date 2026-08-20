// Soglie XP standard D&D 5e (SRD): xp minima richiesta per raggiungere ciascun livello.
const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export interface XpProgress {
  nextLevelXp: number | null; // null al livello massimo (20): nessun prossimo traguardo
  percent: number; // 0-100, progresso entro il livello corrente
}

export function getXpProgress(level: number, experiencePoints: number): XpProgress {
  const currentLevelXp = XP_THRESHOLDS[level - 1] ?? 0;
  const nextLevelXp = XP_THRESHOLDS[level] ?? null;

  if (nextLevelXp === null) {
    return { nextLevelXp: null, percent: 100 };
  }

  const span = nextLevelXp - currentLevelXp;
  const progress = experiencePoints - currentLevelXp;
  const percent = span > 0 ? Math.max(0, Math.min(100, (progress / span) * 100)) : 100;

  return { nextLevelXp, percent };
}
