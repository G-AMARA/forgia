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

// Ciclo di difficoltà a 4 giorni condiviso dai 3 minigiochi: stesso schema di rotazione che
// avevano già (SET[indiceGiornoLocale() % 4]), ma qui separato dalla scelta del CONTENUTO
// (vedi creaRngGiornaliero sotto). Così la difficoltà resta prevedibile e ciclica, mentre il
// contenuto generato proceduralmente per quel tier non si ripete mai in un pattern fisso.
export function tierDifficolta(oggi: Date = new Date()): 0 | 1 | 2 | 3 {
  return (indiceGiornoLocale(oggi) % 4) as 0 | 1 | 2 | 3;
}

// FNV-1a a 32 bit: hash deterministico stringa -> intero, usato solo per derivare un seed
// numerico dal salt (nome del minigioco/tentativo di retry), nessuna esigenza crittografica.
function hashStringa(testo: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < testo.length; i++) {
    hash ^= testo.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// PRNG deterministico (mulberry32): stesso seed => stessa sequenza, sempre. Necessario per
// generare contenuto procedurale che sia IDENTICO per tutti gli utenti nello stesso giorno
// (requisito esistente del Dungeon EXP), cosa che Math.random() non garantirebbe.
function mulberry32(seed: number): () => number {
  let stato = seed >>> 0;
  return () => {
    stato = (stato + 0x6d2b79f5) >>> 0;
    let t = stato;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// `salt` identifica il minigioco (es. 'quiz', 'crossword', 'dungeon-run') così i tre non
// condividono la stessa sequenza pseudo-casuale pur partendo dallo stesso indiceGiornoLocale.
// Per i retry di autovalidazione (cruciverba, dungeon run) si passa un salt diverso per
// tentativo (es. `${gioco}:retry${n}`) per ottenere un seed figlio deterministico ma distinto.
export function creaRngGiornaliero(oggi: Date, salt: string): () => number {
  const seed = (hashStringa(salt) ^ indiceGiornoLocale(oggi)) >>> 0;
  return mulberry32(seed);
}
