export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// Colore del cerchietto del modificatore: smeraldo scuro con bordo luminoso se positivo,
// rosso scuro con bordo luminoso se negativo, ferro neutro se zero. Il bordo (non solo lo
// sfondo) è ciò che li fa risaltare sul pannello scuro.
export function modifierBadgeClass(score: number): string {
  const mod = abilityModifier(score);
  if (mod > 0) return 'bg-emerald-900 border border-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.5)]';
  if (mod < 0) return 'bg-red-950 border border-red-500/80 shadow-[0_0_6px_rgba(239,68,68,0.45)]';
  return 'bg-forge-iron border border-forge-border-soft';
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