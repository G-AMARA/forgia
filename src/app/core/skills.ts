export interface SkillDef {
  key: string;
  ability: 'str' | 'dex' | 'cos' | 'int' | 'wis' | 'cha';
}

export const SKILLS: SkillDef[] = [
  { key: 'acrobatics', ability: 'dex' },
  { key: 'animal_handling', ability: 'wis' },
  { key: 'arcana', ability: 'int' },
  { key: 'athletics', ability: 'str' },
  { key: 'deception', ability: 'cha' },
  { key: 'history', ability: 'int' },
  { key: 'insight', ability: 'wis' },
  { key: 'intimidation', ability: 'cha' },
  { key: 'investigation', ability: 'int' },
  { key: 'medicine', ability: 'wis' },
  { key: 'nature', ability: 'int' },
  { key: 'perception', ability: 'wis' },
  { key: 'performance', ability: 'cha' },
  { key: 'persuasion', ability: 'cha' },
  { key: 'religion', ability: 'int' },
  { key: 'sleight_of_hand', ability: 'dex' },
  { key: 'stealth', ability: 'dex' },
  { key: 'survival', ability: 'wis' },
];
