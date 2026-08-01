// La colonna "school" degli incantesimi arriva sempre in inglese dall'SRD e non passa
// per content_translations (solo name/description sono tradotti lì): la mappiamo qui.
const SCHOOL_TRANSLATIONS_IT: Record<string, string> = {
  abjuration: 'Abiurazione',
  conjuration: 'Evocazione',
  divination: 'Divinazione',
  enchantment: 'Ammaliamento',
  evocation: 'Invocazione',
  illusion: 'Illusione',
  necromancy: 'Necromanzia',
  transmutation: 'Trasmutazione',
};

export function translateSpellSchool(school: string | null | undefined, locale: string): string {
  if (!school) return '';
  if (locale !== 'it') return school;
  return SCHOOL_TRANSLATIONS_IT[school.trim().toLowerCase()] ?? school;
}
