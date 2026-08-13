/** Converte il nome classe (es. "Fighter") nello slug del file immagine (es. "fighter"). */
function slugify(className: string): string {
  return className
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Path dell'immagine di sfondo della classe, dentro public/classes/{classe}[F].png.
 * Le versioni femminili sono file a parte con suffisso F (es. bardo.png / bardoF.png).
 */
export function getClassImagePath(
  className: string | null | undefined,
  sex?: 'M' | 'F' | null
): string | null {
  if (!className) return null;
  const suffix = sex === 'F' ? 'F' : '';
  return `classes/${slugify(className)}${suffix}.png`;
}
