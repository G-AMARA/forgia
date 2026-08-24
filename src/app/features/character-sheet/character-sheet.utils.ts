export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// Colore del cerchietto del modificatore: verde se positivo, rosso se negativo, grigio se zero.
export function modifierBadgeClass(score: number): string {
  const mod = abilityModifier(score);
  if (mod > 0) return 'bg-forest';
  if (mod < 0) return 'bg-red-600';
  return 'bg-slate-500';
}

// Progressione standard D&D 5e: +2 dal livello 1 al 4, poi +1 ogni 4 livelli fino a +6 al livello 20.
export function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

// Divide una lista in N colonne contigue (lette dall'alto in basso per colonna, poi si
// passa alla successiva): serve per i separatori orizzontali "per colonna" (divide-y su
// ogni colonna), che con un'unica griglia row-first taglierebbero trasversalmente tutte
// le colonne invece di restare dentro ciascuna.
export function chunkIntoColumns<T>(items: T[], columns: number): T[][] {
  const perColumn = Math.ceil(items.length / columns);
  return Array.from({ length: columns }, (_, i) => items.slice(i * perColumn, (i + 1) * perColumn));
}