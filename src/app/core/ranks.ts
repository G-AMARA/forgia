export interface RankTier {
  minHours: number;
  name: string;
  icon: string;
  // Slug stabile usato per mappare il rango su una cartella (es. public/cards/rank/<key>/),
  // così un rinomino del nome visualizzato non rompe i riferimenti alle risorse su disco.
  key: string;
}

// Tabella dei ranghi in ordine crescente: deve restare sincronizzata con la tabella
// public.rank_tiers su Supabase. Duplicata qui per calcolare il rango lato client
// (tick del tracker, evento realtime) senza un round-trip al DB ogni volta.
export const RANK_TIERS: RankTier[] = [
  { minHours: 0, name: 'Adepto', icon: 'icons/adepto.png', key: 'adepto' },
  { minHours: 10, name: 'Ramingo di Bronzo', icon: 'icons/ramingo.png', key: 'ramingo-di-bronzo' },
  { minHours: 50, name: 'Avventuriero di Ferro', icon: 'icons/avventuriero.png', key: 'avventuriero-di-ferro' },
  { minHours: 100, name: "Canaglia d'Argento", icon: 'icons/canaglia.png', key: 'canaglia-d-argento' },
  { minHours: 200, name: "Paladino d'Oro", icon: 'icons/paladino.png', key: 'paladino-d-oro' },
  { minHours: 350, name: 'Campione di Platino', icon: 'icons/campione.png', key: 'campione-di-platino' },
  { minHours: 500, name: 'Signore del Mithral', icon: 'icons/signore.png', key: 'signore-del-mithral' },
];

// Rango speciale riservato agli admin: non è sbloccato dalle ore, ha sempre priorità
// assoluta sul calcolo normale (stesso controllo fatto lato DB in get_user_rank).
export const FATO_RANK: RankTier = { minHours: -1, name: 'Fato', icon: 'icons/fato.png', key: 'fato' };

// Quota di elementi "aggiungibili in campagna" per rango araldico — PNG creati (globale,
// Npc.createNpc), mostri selezionati nel Bestiario e album creati in Mappe (entrambi per
// singola campagna, vedi BestiaryStore.myBestiaryLimit/MapAlbumsStore.myMapLimit): stessa
// identica progressione per tutti e tre, 1 per Adepto poi 3/5/7/9/11/13 (+2 per rango
// salito). Fato (admin) è l'unico caso illimitato, riconosciuto dallo stesso identifier
// FATO_RANK usato da getRankForSeconds. Deve restare in sync con la function SQL
// get_campaign_addition_limit (vedi sql/2026-09-12_campaign_addition_limits.sql), che
// applica lo stesso limite lato RLS su tutte e tre le tabelle.
export function campaignAdditionLimitForTier(tier: RankTier): number {
  if (tier === FATO_RANK) return Infinity;
  const index = RANK_TIERS.indexOf(tier);
  return index <= 0 ? 1 : index * 2 + 1;
}

export function getCampaignAdditionLimitForSeconds(seconds: number, isAdmin: boolean): number {
  return campaignAdditionLimitForTier(getRankForSeconds(seconds, isAdmin));
}

// Quota di PG creabili nel parco personale (CharacterStore.roster) per rango araldico:
// 1 per Adepto, poi +1 per ogni rango successivo. Fato (admin) è illimitato, come per
// npcLimitForTier. Deve restare in sync con la function SQL get_character_creation_limit
// (vedi sql/2026-09-06_character_roster.sql), che applica lo stesso limite lato RLS.
export function characterLimitForTier(tier: RankTier): number {
  if (tier === FATO_RANK) return Infinity;
  return RANK_TIERS.indexOf(tier) + 1;
}

export function getCharacterLimitForSeconds(seconds: number, isAdmin: boolean): number {
  return characterLimitForTier(getRankForSeconds(seconds, isAdmin));
}

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

// Come hoursToExp, ma dai secondi grezzi senza arrotondare prima alle ore intere: usata per
// mostrare l'exp "live" di un utente (badge Araldica, leaderboard Avventurieri). Con
// hoursToExp(Math.floor(secondi/3600)) un guadagno piccolo (es. i pochi minuti accreditati
// da Dungeon Run/Quiz) spariva quasi sempre nell'arrotondamento, o al contrario appariva
// come un salto pieno di +10 se faceva scattare un'ora intera già quasi raggiunta. Qui la
// granularità è di 360 secondi (coerente con "1 xp Dungeon Run/Quiz = 360 secondi", vedi le
// RPC award_dungeon_run_xp/award_dungeon_quiz_xp): stesso valore di hoursToExp sui multipli
// esatti di un'ora, ma visibile anche a metà strada.
export function secondsToExp(seconds: number): number {
  return Math.floor(seconds / (3600 / EXP_PER_HOUR));
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
      exp: secondsToExp(profile.navigation_seconds),
    };
    const bucket = buckets.get(tier.name);
    if (bucket) bucket.push(entry);
    else buckets.set(tier.name, [entry]);
  }

  return orderedTiers
    .filter((tier) => buckets.has(tier.name))
    .map((tier) => ({ tier, entries: buckets.get(tier.name)!.sort((a, b) => b.exp - a.exp) }));
}

