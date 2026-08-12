// Contratto per classes.starting_equipment / backgrounds.starting_equipment (jsonb).
// Un gruppo con una sola opzione è fisso (nessuna scelta da mostrare); con più opzioni
// è una scelta A/B/C. Ogni opzione può bundlare più refs (es. "arma da guerra + scudo").
export type WeaponCategoryTag =
  | 'simple' | 'simple_melee' | 'simple_ranged'
  | 'martial' | 'martial_melee' | 'martial_ranged';

export type ToolCategoryTag = 'artisan_tools' | 'musical_instrument';

export type EquipmentRef =
  | { kind: 'item'; table: 'weapons' | 'equipment'; name: string; quantity?: number }
  | { kind: 'category'; table: 'weapons' | 'equipment'; category: WeaponCategoryTag | ToolCategoryTag; quantity?: number };

export interface EquipmentOption {
  refs: EquipmentRef[];
}

export interface EquipmentChoiceGroup {
  key: string;
  options: EquipmentOption[];
}

// Oggetti concreti selezionabili per un ref 'category', filtrando il catalogo già caricato
// (stesso pattern di availableSpells in character-create.ts: confronto sul dato raw/inglese,
// mai sul nome tradotto, perché weapon_category/tool_category non hanno traduzione).
export function resolveCategoryOptions(
  ref: Extract<EquipmentRef, { kind: 'category' }>,
  weapons: any[],
  equipment: any[]
): any[] {
  if (ref.table === 'weapons') {
    const [weaponCategory, rangeCategory] = ref.category.split('_') as [string, string | undefined];
    return weapons.filter(
      (w) => w.raw.weapon_category === weaponCategory && (!rangeCategory || w.raw.range_category === rangeCategory)
    );
  }
  return equipment.filter((e) => e.raw.tool_category === ref.category);
}

// Oggetto concreto per un ref 'item', trovato per nome canonico inglese (raw.name),
// indipendentemente dalla lingua correntemente selezionata dall'utente.
export function resolveItemRef(
  ref: Extract<EquipmentRef, { kind: 'item' }>,
  weapons: any[],
  equipment: any[]
): any | null {
  const source = ref.table === 'weapons' ? weapons : equipment;
  return source.find((i) => i.raw.name?.toLowerCase() === ref.name.toLowerCase()) ?? null;
}
