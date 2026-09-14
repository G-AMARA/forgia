// Pool di parole+indizio a tema D&D per il cruciverba procedurale (crossword-generator.ts).
// `risposta` è sempre MAIUSCOLA, solo lettere A-Z senza spazi/accenti (vincolo del rendering a
// griglia, una lettera per cella). `difficolta` (0=nota, 3=di nicchia) filtra il pool in base
// al tierDifficolta del giorno: più alto il tier, più ampio il pool ammesso (vedi
// crossword-generator.ts, che include anche tutti i tier inferiori).

export interface VoceCrossword {
  risposta: string;
  indizio: string;
  difficolta: 0 | 1 | 2 | 3;
}

export const POOL_PAROLE_DND: VoceCrossword[] = [
  // tier 0: nozioni molto note
  { risposta: 'DRAGO', indizio: 'Creatura leggendaria e sputafuoco, incubo di ogni regno', difficolta: 0 },
  { risposta: 'LADRO', indizio: 'Classe furtiva, esperta di trappole, serrature e attacchi a sorpresa', difficolta: 0 },
  { risposta: 'MAGO', indizio: 'Classe che scaglia incantesimi attingendo allo studio arcano', difficolta: 0 },
  { risposta: 'ELFO', indizio: 'Razza longeva ed elegante, affine a magia e arco', difficolta: 0 },
  { risposta: 'NANO', indizio: 'Razza robusta, maestra di forgia e miniera', difficolta: 0 },
  { risposta: 'ORCO', indizio: 'Umanoide brutale, spesso in orda, classico nemico di basso livello', difficolta: 0 },
  { risposta: 'SPADA', indizio: "Arma da mischia per eccellenza, in tutte le sue varianti", difficolta: 0 },
  { risposta: 'SCUDO', indizio: 'Oggetto difensivo imbracciato, aumenta la Classe Armatura', difficolta: 0 },
  { risposta: 'GOBLIN', indizio: 'Piccolo umanoide verde e vigliacco, nemico da manuale base', difficolta: 0 },
  { risposta: 'FULMINE', indizio: 'Incantesimo che scatena una scarica elettrica lungo una linea', difficolta: 0 },
  { risposta: 'CURA', indizio: 'Incantesimo che ripristina i punti ferita', difficolta: 0 },
  { risposta: 'ARCO', indizio: 'Arma a distanza classica di elfi e ranger', difficolta: 0 },

  // tier 1
  { risposta: 'CHIERICO', indizio: 'Classe che canalizza il potere della propria divinità in incantesimi di cura', difficolta: 1 },
  { risposta: 'PALADINO', indizio: 'Guerriero sacro legato da un giuramento solenne', difficolta: 1 },
  { risposta: 'BARBARO', indizio: 'Classe che canalizza la Furia in battaglia, ignorando il dolore', difficolta: 1 },
  { risposta: 'VAMPIRO', indizio: 'Non-morto aristocratico che si nutre di sangue, teme la luce del sole', difficolta: 1 },
  { risposta: 'LICH', indizio: 'Non-morto incantatore che lega la propria anima a un phylactery', difficolta: 1 },
  { risposta: 'GNOMO', indizio: 'Razza piccola e ingegnosa, spesso illusionista o inventore', difficolta: 1 },
  { risposta: 'MAZZA', indizio: 'Arma contundente semplice, prediletta da chierici che non versano sangue', difficolta: 1 },
  { risposta: 'ELMO', indizio: "Protezione per la testa, parte dell'armatura pesante", difficolta: 1 },
  { risposta: 'CORAZZA', indizio: 'Armatura pesante che copre il torso, forgiata in metallo', difficolta: 1 },
  { risposta: 'TROLL', indizio: 'Mostro rigenerante che teme solo fuoco e acido', difficolta: 1 },
  { risposta: 'ORSO', indizio: 'Bestione della foresta, temuto per la forza bruta e gli artigli', difficolta: 1 },
  { risposta: 'LUPO', indizio: 'Animale predatore, spesso evocato da druidi e ranger come compagno', difficolta: 1 },

  // tier 2
  { risposta: 'STREGONE', indizio: 'Classe che scaglia magia innata, nel sangue fin dalla nascita', difficolta: 2 },
  { risposta: 'MONACO', indizio: 'Classe che incanala energia interiore in colpi a mani nude', difficolta: 2 },
  { risposta: 'RANGER', indizio: 'Classe esploratrice, cacciatore di creature e maestro di sopravvivenza', difficolta: 2 },
  { risposta: 'DEMONE', indizio: 'Creatura malvagia proveniente dagli Abissi, corrotta e crudele', difficolta: 2 },
  { risposta: 'GRIFONE', indizio: 'Creatura per metà aquila e per metà leone, cavalcatura alata', difficolta: 2 },
  { risposta: 'ARPIA', indizio: 'Creatura per metà donna e metà uccello, canto ammaliante e letale', difficolta: 2 },
  { risposta: 'ASCIA', indizio: 'Arma da mischia tagliente, spesso impugnata a due mani da un barbaro', difficolta: 2 },
  { risposta: 'LANCIA', indizio: 'Arma d’asta con portata maggiore della spada', difficolta: 2 },
  { risposta: 'PUGNALE', indizio: 'Arma da mischia leggera, ideale per un attacco furtivo', difficolta: 2 },
  { risposta: 'RUNA', indizio: "Simbolo magico inciso su un oggetto, ne potenzia l'incantamento", difficolta: 2 },
  { risposta: 'GEMMA', indizio: 'Pietra preziosa, componente materiale di molti incantesimi', difficolta: 2 },
  { risposta: 'ANELLO', indizio: 'Gioiello magico indossabile, spesso fonte di poteri straordinari', difficolta: 2 },

  // tier 3: di nicchia
  { risposta: 'KOBOLD', indizio: 'Piccolo umanoide rettiliano, vive in tana e ama le trappole', difficolta: 3 },
  { risposta: 'MANTICORA', indizio: 'Creatura leonina con volto umano e coda di aculei velenosi', difficolta: 3 },
  { risposta: 'BASILISCO', indizio: 'Creatura nota per pietrificare con lo sguardo', difficolta: 3 },
  { risposta: 'NINFA', indizio: 'Spirito della natura legato a un luogo, un bosco o una sorgente', difficolta: 3 },
  { risposta: 'SIRENA', indizio: 'Creatura acquatica dal canto ammaliante, insidia i marinai', difficolta: 3 },
  { risposta: 'IDRA', indizio: 'Rettile multi-testa: tagliane una e ne rispuntano due, a meno di bruciare la ferita', difficolta: 3 },
  { risposta: 'FRUSTA', indizio: 'Arma da mischia flessibile, colpisce a distanza ravvicinata insolita', difficolta: 3 },
  { risposta: 'ALABARDA', indizio: "Arma d'asta pesante, unisce lama e punta per tagliare e trafiggere", difficolta: 3 },
  { risposta: 'BALESTRA', indizio: 'Arma a distanza meccanica, più lenta ma più potente di un arco semplice', difficolta: 3 },
  { risposta: 'TRIDENTE', indizio: "Arma d'asta a tre punte, spesso associata a creature acquatiche", difficolta: 3 },
  { risposta: 'TALISMANO', indizio: 'Oggetto magico portafortuna, protegge chi lo indossa', difficolta: 3 },
  { risposta: 'FATA', indizio: 'Piccola creatura magica del feywild, dispettosa e sfuggente', difficolta: 3 },
];
