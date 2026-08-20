export interface RankTier {
  minHours: number;
  name: string;
  icon: string;
}

// Tabella dei ranghi in ordine crescente: deve restare sincronizzata con la tabella
// public.rank_tiers su Supabase. Duplicata qui per calcolare il rango lato client
// (tick del tracker, evento realtime) senza un round-trip al DB ogni volta.
export const RANK_TIERS: RankTier[] = [
  { minHours: 0, name: 'Adepto', icon: 'icons/adepto.png' },
  { minHours: 10, name: 'Ramingo di Bronzo', icon: 'icons/ramingo.png' },
  { minHours: 50, name: 'Avventuriero di Ferro', icon: 'icons/avventuriero.png' },
  { minHours: 100, name: "Canaglia d'Argento", icon: 'icons/canaglia.png' },
  { minHours: 200, name: "Paladino d'Oro", icon: 'icons/paladino.png' },
  { minHours: 350, name: 'Campione di Platino', icon: 'icons/campione.png' },
  { minHours: 500, name: 'Signore del Mithral', icon: 'icons/signore.png' },
];

// Rango speciale riservato agli admin: non è sbloccato dalle ore, ha sempre priorità
// assoluta sul calcolo normale (stesso controllo fatto lato DB in get_user_rank).
export const FATO_RANK: RankTier = { minHours: -1, name: 'Fato', icon: 'icons/fato.png' };

export function getRankForSeconds(seconds: number, isAdmin: boolean): RankTier {
  if (isAdmin) return FATO_RANK;

  const hours = seconds / 3600;
  let current = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (hours >= tier.minHours) current = tier;
  }
  return current;
}

// Fato è sempre il rango più alto in assoluto: indice oltre l'ultimo della progressione
// normale, così un passaggio ad admin viene comunque rilevato come "salita di livello".
export function rankIndex(tier: RankTier): number {
  if (tier === FATO_RANK) return RANK_TIERS.length;
  return RANK_TIERS.indexOf(tier);
}

export const EXP_PER_HOUR = 10;

export function hoursToExp(hours: number): number {
  return hours * EXP_PER_HOUR;
}
