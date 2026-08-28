import { CampaignToken } from '../../../../core/campaign-tokens';

// Estratte da InteractiveBoardComponent (permessi/stile puri, senza stato): funzioni e non
// metodi, per tenere il componente sotto il limite di 200 righe.

export function canDragToken(token: CampaignToken, isMaster: boolean, myCharacterId: string | null): boolean {
  if (isMaster) return true;
  return !token.isLocked && myCharacterId !== null && token.characterId === myCharacterId;
}

// A differenza di canDragToken, non bloccata da is_locked: un giocatore può sempre
// togliere dalla plancia la pedina del proprio personaggio.
export function canRemoveFromBoard(token: CampaignToken, isMaster: boolean, myCharacterId: string | null): boolean {
  if (isMaster) return true;
  return myCharacterId !== null && token.characterId === myCharacterId;
}

export function isOwnCharacterToken(token: CampaignToken, myCharacterId: string | null): boolean {
  return myCharacterId !== null && token.characterId === myCharacterId;
}

export function borderClassFor(token: CampaignToken, myCharacterId: string | null): string {
  if (token.characterId && token.characterId === myCharacterId) return 'border-amber-400';
  if (token.characterId !== null) return 'border-slate-400';
  if (token.kind === 'npc') return 'border-sky-400';
  return 'border-red-500';
}
