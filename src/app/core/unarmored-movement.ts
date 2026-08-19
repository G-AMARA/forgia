// Movimento Senza Armatura (Monaco 5e): bonus di velocità per livello, si applica solo senza
// armatura e senza scudo, si somma alla velocità base della razza. Progressione standard SRD.
export function unarmoredMovementBonus(level: number): number {
  if (level >= 18) return 9;
  if (level >= 14) return 7.5;
  if (level >= 10) return 6;
  if (level >= 6) return 4.5;
  if (level >= 3) return 3;
  return 0;
}
