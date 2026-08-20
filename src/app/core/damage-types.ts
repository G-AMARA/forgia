export interface DamageTypeDef {
  key: string;
}

// I 13 tipi di danno standard D&D 5e SRD. Etichette tradotte in locale.ts (damage_type_<key>).
export const DAMAGE_TYPES: DamageTypeDef[] = [
  { key: 'acid' },
  { key: 'bludgeoning' },
  { key: 'cold' },
  { key: 'fire' },
  { key: 'force' },
  { key: 'lightning' },
  { key: 'necrotic' },
  { key: 'piercing' },
  { key: 'poison' },
  { key: 'psychic' },
  { key: 'radiant' },
  { key: 'slashing' },
  { key: 'thunder' },
];
