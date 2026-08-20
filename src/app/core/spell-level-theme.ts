/** Tema cromatico per livello incantesimo: un'unica fonte per bordo, sigillo, icona
 * scuola e glow hover delle card, così non serve ramificare il template per livello. */
export interface SpellLevelTheme {
  level: number;
  color: string; // accento pieno: sigillo, icona, separatore, hover
  soft: string; // stesso colore a bassa opacità: radial gradient di sfondo
  glow: string; // stesso colore a opacità media: box-shadow hover
}

const SPELL_LEVEL_PALETTE: Record<number, string> = {
  0: '#B9C2CC', // trucchetto: grigio/argento
  1: '#4FB8F0', // azzurro
  2: '#2FD1B0', // verde/teal
  3: '#A987F0', // viola
  4: '#5468F0', // blu intenso
  5: '#C23B3B', // rosso scuro
  6: '#F0912F', // arancio
  7: '#E85FD1', // magenta
  8: '#D9B441', // oro
  9: '#EDE4FF', // viola chiarissimo / bianco arcano
};

export function getSpellLevelTheme(level: number): SpellLevelTheme {
  const color = SPELL_LEVEL_PALETTE[level] ?? SPELL_LEVEL_PALETTE[9];
  return {
    level,
    color,
    soft: `${color}1F`,
    glow: `${color}59`,
  };
}
