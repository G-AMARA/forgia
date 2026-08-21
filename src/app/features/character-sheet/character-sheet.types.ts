export type SubTab = 'general' | 'combat' | 'inventory' | 'spells' | 'weapons' | 'diary';

export type AbilityKey = 'str' | 'dex' | 'cos' | 'int' | 'wis' | 'cha';

export const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'cos', 'int', 'wis', 'cha'];

export type AbilityScores = Record<AbilityKey, number>;
