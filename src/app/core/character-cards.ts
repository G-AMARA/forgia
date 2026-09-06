import { RANK_TIERS, RankTier, rankIndex } from './ranks';

export type CardUnlock = { type: 'default' } | { type: 'rank'; minTier: RankTier };

export interface CharacterCard {
  key: string;
  label: string;
  file: string; // percorso relativo dentro public/cards/, es. 'rank/adepto/nome.png'
  unlock: CardUnlock;
}

// Catalogo delle card selezionabili come sfondo del personaggio in campagna (vedi
// campaign-hub). La cartella public/cards/ segue la stessa struttura di questo array:
// public/cards/default/ per la card base, public/cards/rank/<RankTier.key>/ per i set
// sbloccati salendo di araldica. Popolare qui una entry per ogni immagine aggiunta.
export const CHARACTER_CARDS: CharacterCard[] = [
  { key: 'basic', label: 'Base', file: 'default/basic.png', unlock: { type: 'default' } },
  {
    key: 'adepto-01',
    label: 'Adepto',
    file: 'rank/adepto/adepto-01.png',
    unlock: { type: 'rank', minTier: RANK_TIERS[0] },
  },
  {
    key: 'ramingo-01',
    label: 'Ramingo di Bronzo',
    file: 'rank/ramingo-di-bronzo/ramingo-01.png',
    unlock: { type: 'rank', minTier: RANK_TIERS[1] },
  },
  {
    key: 'avventuriero-01',
    label: 'Avventuriero di Ferro',
    file: 'rank/avventuriero-di-ferro/avventuriero-01.png',
    unlock: { type: 'rank', minTier: RANK_TIERS[2] },
  },
  {
    key: 'canaglia-01',
    label: 'Canaglia d Argento',
    file: 'rank/canaglia-d-argento/canaglia-01.png',
    unlock: { type: 'rank', minTier: RANK_TIERS[3] },
  },
  {
    key: 'paladino-01',
    label: 'Paladino d Oro',
    file: 'rank/paladino-d-oro/paladino-01.png',
    unlock: { type: 'rank', minTier: RANK_TIERS[4] },
  },
  {
    key: 'campione-01',
    label: 'Campione di Platino',
    file: 'rank/campione-di-platino/campione-01.png',
    unlock: { type: 'rank', minTier: RANK_TIERS[4] },
  },
  {
    key: 'signore-01',
    label: 'Signore del Mithral',
    file: 'rank/signore-del-mithral/signore-01.png',
    unlock: { type: 'rank', minTier: RANK_TIERS[4] },
  },
];

export function getCardImagePath(card: CharacterCard): string {
  // encodeURIComponent per singolo segmento: il file può stare in una sottocartella,
  // non va incodificato lo slash del percorso.
  return `cards/${card.file.split('/').map(encodeURIComponent).join('/')}`;
}

export function isCardUnlocked(card: CharacterCard, currentTier: RankTier): boolean {
  if (card.unlock.type === 'default') return true;
  return rankIndex(currentTier) >= rankIndex(card.unlock.minTier);
}

export function getUnlockedCards(currentTier: RankTier): CharacterCard[] {
  return CHARACTER_CARDS.filter((card) => isCardUnlocked(card, currentTier));
}

export function getDefaultCard(): CharacterCard {
  return CHARACTER_CARDS.find((card) => card.unlock.type === 'default') ?? CHARACTER_CARDS[0];
}
