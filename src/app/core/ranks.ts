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

export interface RankGroupEntry {
  id: string;
  nickname: string;
  exp: number;
}

export interface RankGroup {
  tier: RankTier;
  entries: RankGroupEntry[];
}

// Raggruppa i profili per rango (RANK_TIERS dal più alto al più basso, come rankList in
// Araldica ma senza Fato), omettendo i gruppi senza iscritti. Il rango è sempre quello che
// spetterebbe per le ore accumulate, anche per gli admin: qui interessa l'araldica "reale",
// non lo status speciale mostrato nel proprio badge (vedi Araldica.applySeconds).
export function groupByRank(
  profiles: { id: string; nickname: string | null; navigation_seconds: number }[]
): RankGroup[] {
  const orderedTiers = RANK_TIERS.slice().reverse();
  const buckets = new Map<string, RankGroupEntry[]>();

  for (const profile of profiles) {
    const tier = getRankForSeconds(profile.navigation_seconds, false);
    const entry: RankGroupEntry = {
      id: profile.id,
      nickname: profile.nickname ?? '???',
      exp: hoursToExp(Math.floor(profile.navigation_seconds / 3600)),
    };
    const bucket = buckets.get(tier.name);
    if (bucket) bucket.push(entry);
    else buckets.set(tier.name, [entry]);
  }

  return orderedTiers
    .filter((tier) => buckets.has(tier.name))
    .map((tier) => ({ tier, entries: buckets.get(tier.name)!.sort((a, b) => b.exp - a.exp) }));
}
