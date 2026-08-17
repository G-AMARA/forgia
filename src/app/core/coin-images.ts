// Nome file = etichetta italiana in maiuscolo (es. public/coin/ORO.png): illustrazioni dei
// bauli usate nei riquadri valuta del tab Equipaggiamento della scheda personaggio.
const COIN_LABEL_FILES: Record<string, string> = {
  copper: 'RAME',
  silver: 'ARGENTO',
  electrum: 'ELETTRO',
  gold: 'ORO',
  platinum: 'PLATINO',
};

/** Path dell'illustrazione del baule per un tipo di moneta, dentro public/coin/{LABEL}.png. */
export function getCoinImagePath(key: string): string {
  return `coin/${COIN_LABEL_FILES[key] ?? key}.png`;
}
