/** Calcola la Classe Armatura risultante da un'armatura base + il modificatore di Destrezza,
 * applicando il limite corretto per categoria (regola D&D 5e).
 * Lo scudo non è un'armatura indossabile a sé: il suo +2 va sommato manualmente sopra
 * la CA già calcolata con l'armatura indossata (o su 10 + Des a mani nude).
 */
export function calculateArmorClass(
  baseArmorClass: number,
  category: string | null | undefined,
  dexModifier: number
): number {
  switch (category) {
    case 'light':
      return baseArmorClass + dexModifier;
    case 'medium':
      return baseArmorClass + Math.min(dexModifier, 2);
    case 'heavy':
      return baseArmorClass;
    default:
      return baseArmorClass + dexModifier;
  }
}
