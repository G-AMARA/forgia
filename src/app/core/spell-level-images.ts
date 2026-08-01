/** Path del timbro per livello incantesimo, dentro public/spells/{level}.png.
 * Dal livello 9 in su condividono un unico timbro: public/spells/10+.png. */
export function getSpellLevelStampPath(level: number): string {
  if (level >= 9) return '/spells/10+.png';
  return `/spells/${level}.png`;
}
