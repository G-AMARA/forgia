/** Path dell'immagine di sfondo di una caratteristica, dentro public/stats/{key}.png (es. str.png). */
export function getAbilityImagePath(key: string): string {
  return `/stats/${key}.png`;
}
