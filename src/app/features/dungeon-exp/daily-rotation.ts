// Indice di rotazione condiviso dai minigiochi a contenuto giornaliero del Dungeon EXP Hub
// (Parole Crociate in dnd-crossword-data.ts, Cripta degli Enigmi in dd-quiz-data.ts):
// entrambi scelgono il proprio set di contenuti con `set[indiceGiornoLocale() % set.length]`.
//
// Math.floor(oggi.getTime() / 86_400_000) userebbe i confini UTC: mezzanotte in Italia non
// coincide con la mezzanotte UTC (sfalsata di 1h in CET, 2h in CEST), quindi il contenuto
// sarebbe rimasto quello del giorno prima per un'ora o due dopo la mezzanotte locale — o
// sarebbe cambiato con un'ora o due di anticipo la sera. Qui invece si passa per Date.UTC()
// sui componenti LOCALI di `oggi` (getFullYear/getMonth/getDate leggono sempre l'ora locale
// del browser), così l'indice scatta esattamente alla mezzanotte di chi gioca.
export function indiceGiornoLocale(oggi: Date = new Date()): number {
  const mezzanotteLocale = Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  return Math.floor(mezzanotteLocale / 86_400_000);
}
