export interface CampaignCover {
  key: string;
  label: string;
  file: string; // nome file esatto dentro src/assets/covers/
  gradient: string; // usato come sfondo di fallback mentre l'immagine carica
}

export const CAMPAIGN_COVERS: CampaignCover[] = [
  { key: 'sword', label: 'Spada', file: 'spada.png', gradient: 'from-stone-dark via-stone to-wine-dark' },
  { key: 'dragon', label: 'Drago', file: 'drago.png', gradient: 'from-forest via-stone to-ink' },
  { key: 'castle', label: 'Castello', file: 'castello.png', gradient: 'from-slate-arcane via-stone to-ink' },
  { key: 'moon', label: 'Luna', file: 'luna.png', gradient: 'from-ink via-slate-arcane to-stone-dark' },
  { key: 'flame', label: 'Fiamma', file: 'fiamma.png', gradient: 'from-wine-dark via-wine to-ink' },
  { key: 'shield', label: 'Scudo', file: 'scudo.png', gradient: 'from-gold via-gold-bright to-stone-dark' },
  { key: 'skull', label: 'Teschio', file: 'teschio.png', gradient: 'from-stone-dark via-ink to-black' },
  { key: 'pirate', label: 'Bandiera Pirata', file: 'bandiera pirata.png', gradient: 'from-wine-dark via-ink to-stone-dark' },
  { key: 'ocean', label: 'Oceano', file: 'oceano.png', gradient: 'from-slate-arcane via-forest to-ink' },
  { key: 'island', label: 'Isola', file: 'isola.png', gradient: 'from-gold via-forest to-slate-arcane' },
];

export function getCover(key: string): CampaignCover {
  return CAMPAIGN_COVERS.find((c) => c.key === key) ?? CAMPAIGN_COVERS[0];
}

export function getCoverImagePath(cover: CampaignCover): string {
  return `/covers/${encodeURIComponent(cover.file)}`;
}