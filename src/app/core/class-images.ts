/** Converte il nome classe (es. "Fighter") nello slug del file immagine (es. "fighter"). */
function slugify(className: string): string {
  return className
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-');
}

/** Path dell'immagine di sfondo della classe, dentro public/classes/{classe}.png. */
export function getClassImagePath(className: string | null | undefined): string | null {
  if (!className) return null;
  return `/classes/${slugify(className)}.png`;
}
