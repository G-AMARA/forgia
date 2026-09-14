// Generatore procedurale dei livelli di "Dungeon Run", seedato sul giorno locale. Sostituisce
// i 4 percorsi statici fissi: la scena Phaser (dungeon-run-scene.ts) resta invariata, consuma
// solo l'interfaccia LivelloDungeon già esistente.
//
// REGOLA CARDINE, mai derogabile: i pozzi (gap fra segmentiTerreno) restano SEMPRE larghi
// esattamente POZZO_LARGHEZZA_PX=80 e il dislivello fra una piattaforma TIER_BASSO e la
// TIER_ALTO adiacente resta SEMPRE GAP_TIER_PX=40 — gli stessi identici valori usati nei 4
// livelli originali (mai validati con un motore fisico, solo per costruzione: la gittata di
// salto a corsa è ~220px, ben oltre 80px). Il generatore non pesca MAI questi due valori da un
// range casuale, proprio per garantire che ogni livello generato resti sempre superabile.
// Il percorso a terra (segmentiTerreno) è di per sé sempre completabile: piattaforme, spine e
// nemici sono ostacoli/bonus opzionali, mai un requisito per raggiungere il forziere finale.

import {
  GIOCATORE_SPAWN_X,
  NUMERO_GEMME_TOTALI,
  TERRENO_Y,
  TIER_ALTO,
  TIER_BASSO,
  TILE_DUNGEON,
  type LivelloDungeon,
  type PiattaformaDungeon,
  type PosizioneNemicoDungeon,
  type PosizioneStaticaDungeon,
  type SegmentoTerreno,
} from '../dungeon-run-data';
import { creaRngGiornaliero, tierDifficolta } from '../daily-rotation';
import { arrotondaAMultiplo, rngInt, rngPick, rngPickN, type Rng } from './rng-utils';

const POZZO_LARGHEZZA_PX = 80;
const GAP_TIER_PX = 40;
const MAX_TENTATIVI = 20;

interface ConfigTier {
  segMin: number;
  segMax: number;
  segLunghMin: number;
  segLunghMax: number;
  piattMin: number;
  piattMax: number;
  probabilitaCoppiaAlta: number;
  nemiciMin: number;
  nemiciMax: number;
  velMin: number;
  velMax: number;
  distMin: number;
  distMax: number;
  spineMin: number;
  spineMax: number;
  durataMin: number;
  durataMax: number;
}

// Calibrata sulla progressione dei 4 livelli originali: più pozzi/piattaforme/nemici, nemici
// più veloci (50→90px/s), più spine, timer più corto, al crescere del tier.
const CONFIG_TIER: ConfigTier[] = [
  { segMin: 4, segMax: 4, segLunghMin: 520, segLunghMax: 680, piattMin: 2, piattMax: 3, probabilitaCoppiaAlta: 0.15, nemiciMin: 3, nemiciMax: 3, velMin: 48, velMax: 55, distMin: 120, distMax: 160, spineMin: 1, spineMax: 1, durataMin: 72, durataMax: 78 },
  { segMin: 5, segMax: 5, segLunghMin: 460, segLunghMax: 600, piattMin: 3, piattMax: 4, probabilitaCoppiaAlta: 0.3, nemiciMin: 4, nemiciMax: 5, velMin: 55, velMax: 62, distMin: 80, distMax: 140, spineMin: 2, spineMax: 2, durataMin: 62, durataMax: 68 },
  { segMin: 5, segMax: 6, segLunghMin: 400, segLunghMax: 560, piattMin: 4, piattMax: 6, probabilitaCoppiaAlta: 0.45, nemiciMin: 5, nemiciMax: 6, velMin: 62, velMax: 72, distMin: 60, distMax: 120, spineMin: 2, spineMax: 3, durataMin: 55, durataMax: 62 },
  { segMin: 6, segMax: 7, segLunghMin: 360, segLunghMax: 520, piattMin: 6, piattMax: 8, probabilitaCoppiaAlta: 0.55, nemiciMin: 6, nemiciMax: 8, velMin: 72, velMax: 90, distMin: 40, distMax: 100, spineMin: 3, spineMax: 4, durataMin: 45, durataMax: 52 },
];

const POOL_NOMI_LIVELLO = [
  "L'Ingresso della Cripta",
  'I Corridoi del Custode',
  'Le Segrete del Custode',
  'Il Cuore Oscuro del Dungeon',
  'Le Gallerie Sommerse',
  "L'Antro del Silenzio",
  'Il Santuario Profanato',
  'Le Rovine Infestate',
];

function generaSegmenti(rng: Rng, cfg: ConfigTier): SegmentoTerreno[] {
  const numSeg = rngInt(rng, cfg.segMin, cfg.segMax);
  const segmenti: SegmentoTerreno[] = [];
  let x = 0;
  for (let i = 0; i < numSeg; i++) {
    const larghezza = arrotondaAMultiplo(rngInt(rng, cfg.segLunghMin, cfg.segLunghMax), TILE_DUNGEON);
    segmenti.push({ x, larghezza });
    x += larghezza;
    if (i < numSeg - 1) x += POZZO_LARGHEZZA_PX;
  }
  return segmenti;
}

function generaPiattaforme(rng: Rng, cfg: ConfigTier, segmenti: SegmentoTerreno[]): PiattaformaDungeon[] {
  const piattaforme: PiattaformaDungeon[] = [];
  const numPiatt = rngInt(rng, cfg.piattMin, cfg.piattMax);
  const segmentiCandidati = segmenti.filter((s) => s.larghezza >= 240);
  if (segmentiCandidati.length === 0) return piattaforme;

  for (let i = 0; i < numPiatt; i++) {
    const segmento = rngPick(segmentiCandidati, rng);
    const largBassa = arrotondaAMultiplo(rngInt(rng, 100, 160), TILE_DUNGEON);
    const margine = 60;
    const xMin = segmento.x + margine;
    const xMax = segmento.x + segmento.larghezza - margine - largBassa;
    if (xMax <= xMin) continue;

    const xBassa = rngInt(rng, xMin, xMax);
    piattaforme.push({ x: xBassa, y: TIER_BASSO, larghezza: largBassa });

    if (rng() < cfg.probabilitaCoppiaAlta) {
      const largAlta = arrotondaAMultiplo(rngInt(rng, 80, 120), TILE_DUNGEON);
      const versoDestra = rng() < 0.5;
      const xAlta = versoDestra ? xBassa + largBassa + GAP_TIER_PX : xBassa - GAP_TIER_PX - largAlta;
      if (xAlta >= segmento.x && xAlta + largAlta <= segmento.x + segmento.larghezza) {
        piattaforme.push({ x: xAlta, y: TIER_ALTO, larghezza: largAlta });
      }
    }
  }

  return piattaforme;
}

function generaNemici(rng: Rng, cfg: ConfigTier, segmenti: SegmentoTerreno[]): PosizioneNemicoDungeon[] {
  const nemici: PosizioneNemicoDungeon[] = [];
  const numNemici = rngInt(rng, cfg.nemiciMin, cfg.nemiciMax);
  const zonaSpawnLibera = GIOCATORE_SPAWN_X + 200;
  const segmentiUtili = segmenti.filter((s) => s.x + s.larghezza > zonaSpawnLibera);
  const pool = segmentiUtili.length > 0 ? segmentiUtili : segmenti;

  for (let i = 0; i < numNemici; i++) {
    const segmento = rngPick(pool, rng);
    const margine = 40;
    const inizioUtile = Math.max(segmento.x + margine, zonaSpawnLibera);
    const fineUtile = segmento.x + segmento.larghezza - margine;
    if (fineUtile <= inizioUtile) continue;

    const x = rngInt(rng, inizioUtile, fineUtile);
    const distanzaMassimaSx = x - (segmento.x + 20);
    const distanzaMassimaDx = segmento.x + segmento.larghezza - 20 - x;
    const distanza = Math.max(20, Math.min(rngInt(rng, cfg.distMin, cfg.distMax), distanzaMassimaSx, distanzaMassimaDx));

    nemici.push({ x, y: TERRENO_Y - 60, distanza, velocita: rngInt(rng, cfg.velMin, cfg.velMax) });
  }

  return nemici;
}

function generaSpine(rng: Rng, cfg: ConfigTier, segmenti: SegmentoTerreno[]): PosizioneStaticaDungeon[] {
  const spine: PosizioneStaticaDungeon[] = [];
  const numSpine = rngInt(rng, cfg.spineMin, cfg.spineMax);
  const segmentiUtili = segmenti.slice(1);
  if (segmentiUtili.length === 0) return spine;

  for (let i = 0; i < numSpine; i++) {
    const segmento = rngPick(segmentiUtili, rng);
    const margine = 60;
    if (segmento.larghezza <= margine * 2) continue;
    const x = rngInt(rng, segmento.x + margine, segmento.x + segmento.larghezza - margine);
    spine.push({ x, y: TERRENO_Y - TILE_DUNGEON / 2 });
  }

  return spine;
}

function generaGemme(rng: Rng, segmenti: SegmentoTerreno[], piattaforme: PiattaformaDungeon[]): PosizioneStaticaDungeon[] {
  const candidati: PosizioneStaticaDungeon[] = [];

  for (const s of segmenti) {
    const punti = Math.max(1, Math.floor(s.larghezza / 300));
    for (let i = 0; i < punti; i++) {
      const x = s.x + ((i + 1) / (punti + 1)) * s.larghezza;
      candidati.push({ x: arrotondaAMultiplo(x, TILE_DUNGEON), y: TERRENO_Y - 60 });
    }
  }
  for (const p of piattaforme) {
    candidati.push({ x: arrotondaAMultiplo(p.x + p.larghezza / 2, TILE_DUNGEON), y: p.y - 60 });
  }

  const scelti = rngPickN(candidati, Math.min(NUMERO_GEMME_TOTALI, candidati.length), rng);
  // Fallback raro (tier 0 con pochissimi segmenti): se i candidati naturali non bastano per
  // arrivare a NUMERO_GEMME_TOTALI, si aggiungono varianti leggermente spostate di un candidato
  // esistente piuttosto che lasciare meno di 10 gemme (vincolo fisso della RPC lato server).
  while (scelti.length < NUMERO_GEMME_TOTALI && candidati.length > 0) {
    const base = rngPick(candidati, rng);
    scelti.push({ x: base.x + rngInt(rng, -40, 40), y: base.y });
  }

  return scelti.slice(0, NUMERO_GEMME_TOTALI);
}

function costruisciLivello(rng: Rng, tier: 0 | 1 | 2 | 3): LivelloDungeon {
  const cfg = CONFIG_TIER[tier];
  const segmentiTerreno = generaSegmenti(rng, cfg);
  const piattaforme = generaPiattaforme(rng, cfg, segmentiTerreno);
  const posizioniNemici = generaNemici(rng, cfg, segmentiTerreno);
  const posizioniSpine = generaSpine(rng, cfg, segmentiTerreno);
  const posizioniGemme = generaGemme(rng, segmentiTerreno, piattaforme);

  const ultimoSegmento = segmentiTerreno[segmentiTerreno.length - 1];
  const larghezzaMondo = ultimoSegmento.x + ultimoSegmento.larghezza;
  const forziereX = larghezzaMondo - 80;

  return {
    nome: rngPick(POOL_NOMI_LIVELLO, rng),
    larghezzaMondo,
    durataSecondi: rngInt(rng, cfg.durataMin, cfg.durataMax),
    segmentiTerreno,
    piattaforme,
    posizioniSpine,
    posizioniNemici,
    posizioniGemme,
    forziereX,
  };
}

// Autovalidazione: ricontrolla tutti gli invarianti geometrici che garantiscono la
// superabilità del livello, prima di consegnarlo alla scena Phaser.
function validaLivello(livello: LivelloDungeon): void {
  for (let i = 0; i < livello.segmentiTerreno.length - 1; i++) {
    const attuale = livello.segmentiTerreno[i];
    const successivo = livello.segmentiTerreno[i + 1];
    const gap = successivo.x - (attuale.x + attuale.larghezza);
    if (gap !== POZZO_LARGHEZZA_PX) throw new Error(`Pozzo con larghezza ${gap}, atteso ${POZZO_LARGHEZZA_PX}`);
  }

  for (const s of livello.segmentiTerreno) {
    if (s.larghezza % TILE_DUNGEON !== 0) throw new Error(`Segmento largo ${s.larghezza}, non multiplo di ${TILE_DUNGEON}`);
  }
  for (const p of livello.piattaforme) {
    if (p.larghezza % TILE_DUNGEON !== 0) throw new Error(`Piattaforma larga ${p.larghezza}, non multiplo di ${TILE_DUNGEON}`);
  }

  const piattaformeBasse = livello.piattaforme.filter((p) => p.y === TIER_BASSO);
  for (const alta of livello.piattaforme.filter((p) => p.y === TIER_ALTO)) {
    const collegata = piattaformeBasse.some(
      (bassa) => bassa.x + bassa.larghezza + GAP_TIER_PX === alta.x || alta.x + alta.larghezza + GAP_TIER_PX === bassa.x
    );
    if (!collegata) throw new Error(`Piattaforma TIER_ALTO a x=${alta.x} senza TIER_BASSO adiacente a gap ${GAP_TIER_PX}`);
  }

  if (livello.posizioniGemme.length !== NUMERO_GEMME_TOTALI) {
    throw new Error(`Gemme generate ${livello.posizioniGemme.length}, attese esattamente ${NUMERO_GEMME_TOTALI}`);
  }

  const tutteLeX = [
    ...livello.segmentiTerreno.map((s) => s.x + s.larghezza),
    ...livello.piattaforme.map((p) => p.x + p.larghezza),
    ...livello.posizioniNemici.map((n) => n.x),
    ...livello.posizioniSpine.map((s) => s.x),
    ...livello.posizioniGemme.map((g) => g.x),
    livello.forziereX,
  ];
  if (tutteLeX.some((x) => x < 0 || x > livello.larghezzaMondo)) {
    throw new Error('Coordinata x fuori dai limiti del mondo generato');
  }

  const forziereSuTerreno = livello.segmentiTerreno.some(
    (s) => livello.forziereX >= s.x && livello.forziereX <= s.x + s.larghezza
  );
  if (!forziereSuTerreno) throw new Error('Forziere non poggia su alcun segmento di terreno solido');
}

export function generaLivelloDelGiorno(oggi: Date, livelloFallback: LivelloDungeon): LivelloDungeon {
  const tier = tierDifficolta(oggi);

  for (let tentativo = 0; tentativo < MAX_TENTATIVI; tentativo++) {
    const rng = creaRngGiornaliero(oggi, `dungeon-run:retry${tentativo}`);
    try {
      const livello = costruisciLivello(rng, tier);
      validaLivello(livello);
      return livello;
    } catch {
      continue;
    }
  }

  return livelloFallback;
}
