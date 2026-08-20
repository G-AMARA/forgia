// Nome file = etichetta italiana in maiuscolo (es. public/stats/FORZA.png): illustrazioni
// dedicate ai riquadri statistica del tab Generale della scheda personaggio.
const STAT_LABEL_FILES: Record<string, string> = {
  str: 'FORZA',
  dex: 'DESTREZZA',
  cos: 'COSTITUZIONE',
  int: 'INTELLIGENZA',
  wis: 'SAGGEZZA',
  cha: 'CARISMA',
};

/** Path dell'illustrazione di sfondo per il riquadro statistica nel tab Generale, dentro public/stats/{LABEL}.png. */
export function getStatLabelImagePath(key: string): string {
  return `stats/${STAT_LABEL_FILES[key] ?? key}.png`;
}
