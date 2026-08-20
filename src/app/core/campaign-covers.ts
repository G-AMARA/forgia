export interface CampaignCover {
  key: string;
  label: string;
  file: string; // nome file esatto dentro src/assets/covers/
  gradient: string; // usato come sfondo di fallback mentre l'immagine carica
}

export const CAMPAIGN_COVERS: CampaignCover[] = [
  { key: 'wood', label: 'Bosco', file: 'bosco.png', gradient: 'from-stone-dark via-stone to-wine-dark' },
  { key: 'dragon', label: 'Drago', file: 'drago.png', gradient: 'from-forest via-stone to-ink' },
  { key: 'castle', label: 'Castello', file: 'castello.png', gradient: 'from-slate-arcane via-stone to-ink' },
  { key: 'moon', label: 'Luna', file: 'luna.png', gradient: 'from-ink via-slate-arcane to-stone-dark' },
  { key: 'flame', label: 'Fiamma', file: 'fiamma.png', gradient: 'from-wine-dark via-wine to-ink' },
  { key: 'lake', label: 'Lago', file: 'lago.png', gradient: 'from-gold via-gold-bright to-stone-dark' },
  { key: 'cave', label: 'Caverna', file: 'caverna.png', gradient: 'from-stone-dark via-ink to-black' },
  { key: 'pirate', label: 'Pirati', file: 'pirati.png', gradient: 'from-wine-dark via-ink to-stone-dark' },
  { key: 'mountain', label: 'Montagna', file: 'montagna.png', gradient: 'from-slate-arcane via-forest to-ink' },
  { key: 'island', label: 'Isola', file: 'isola.png', gradient: 'from-gold via-forest to-slate-arcane' },
  { key: 'sea', label: 'Mare', file: 'mare.png', gradient: 'from-slate-arcane via-forest to-ink' },
];

export function getCover(key: string): CampaignCover {
  return CAMPAIGN_COVERS.find((c) => c.key === key) ?? CAMPAIGN_COVERS[0];
}

export function getCoverImagePath(cover: CampaignCover): string {
  return `covers/${encodeURIComponent(cover.file)}`;
}