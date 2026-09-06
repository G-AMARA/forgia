/** Tema cromatico per scuola di magia: bordo, texture di sfondo e glow hover di ogni
 * card incantesimo, così ogni scuola ha un'identità visiva riconoscibile a colpo d'occhio.
 * Le classi Tailwind sono scritte per intero (mai concatenate a runtime) perché il motore
 * JIT le rileva solo se compaiono letteralmente nel sorgente. */
export interface SpellSchoolTheme {
  /** border-2 + colore/opacità del bordo */
  border: string;
  /** classi del layer di texture di sfondo (gradiente a bassa opacità) */
  bg: string;
  /** classi hover:shadow-lg + colore del bagliore */
  glow: string;
  /** accento pieno: icona, separatore, filo superiore, watermark */
  accent: string;
}

const DEFAULT_THEME: SpellSchoolTheme = {
  border: 'border-2 border-slate-500/30',
  bg: 'bg-gradient-to-b from-slate-800/30 to-transparent',
  glow: 'hover:shadow-lg hover:shadow-slate-500/20',
  accent: '#94a3b8',
};

const SPELL_SCHOOL_PALETTE: Record<string, SpellSchoolTheme> = {
  abjuration: {
    border: 'border-2 border-cyan-500/30',
    bg: 'bg-radial from-cyan-950/40 via-transparent to-transparent',
    glow: 'hover:shadow-lg hover:shadow-cyan-500/20',
    accent: '#22d3ee',
  },
  conjuration: {
    border: 'border-2 border-amber-500/30',
    bg: 'bg-gradient-to-br from-amber-950/30 to-transparent',
    glow: 'hover:shadow-lg hover:shadow-amber-500/20',
    accent: '#f59e0b',
  },
  divination: {
    border: 'border-2 border-indigo-500/30',
    bg: 'bg-radial from-indigo-950/40 to-transparent',
    glow: 'hover:shadow-lg hover:shadow-indigo-500/20',
    accent: '#818cf8',
  },
  enchantment: {
    border: 'border-2 border-fuchsia-500/30',
    bg: 'bg-gradient-to-tr from-fuchsia-950/30 to-transparent',
    glow: 'hover:shadow-lg hover:shadow-fuchsia-500/20',
    accent: '#e879f9',
  },
  evocation: {
    border: 'border-2 border-red-500/30',
    bg: 'bg-gradient-to-br from-red-950/40 via-orange-950/20 to-transparent',
    glow: 'hover:shadow-lg hover:shadow-orange-500/20',
    accent: '#fb923c',
  },
  illusion: {
    border: 'border-2 border-purple-500/30',
    bg: 'bg-gradient-to-r from-purple-950/30 via-cyan-950/20 to-transparent',
    glow: 'hover:shadow-lg hover:shadow-purple-500/20',
    accent: '#c084fc',
  },
  necromancy: {
    border: 'border-2 border-emerald-500/30',
    bg: 'bg-gradient-to-b from-emerald-950/30 to-transparent',
    glow: 'hover:shadow-lg hover:shadow-emerald-500/20',
    accent: '#34d399',
  },
  transmutation: {
    border: 'border-2 border-yellow-500/30',
    bg: 'bg-gradient-to-bl from-yellow-950/30 to-transparent',
    glow: 'hover:shadow-lg hover:shadow-yellow-500/20',
    accent: '#facc15',
  },
};

export function getSpellSchoolTheme(schoolRaw: string | null | undefined): SpellSchoolTheme {
  return SPELL_SCHOOL_PALETTE[schoolRaw?.toLowerCase() ?? ''] ?? DEFAULT_THEME;
}
