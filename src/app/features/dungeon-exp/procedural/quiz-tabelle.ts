// Tabelle dati D&D 5e pure, usate da quiz-templates.ts per generare domande a runtime.
// Ogni riga ha un campo `tier` (0=molto noto, 3=di nicchia): i template pescano la riga
// "corretta" pesando verso il tier del giorno (vedi tierDifficolta in daily-rotation.ts).

export interface RigaClasse {
  nome: string;
  dadoVita: string;
  tier: 0 | 1 | 2 | 3;
}

export const TABELLA_CLASSI: RigaClasse[] = [
  { nome: 'Guerriero', dadoVita: 'd10', tier: 0 },
  { nome: 'Ladro', dadoVita: 'd8', tier: 0 },
  { nome: 'Mago', dadoVita: 'd6', tier: 0 },
  { nome: 'Chierico', dadoVita: 'd8', tier: 0 },
  { nome: 'Barbaro', dadoVita: 'd12', tier: 1 },
  { nome: 'Bardo', dadoVita: 'd8', tier: 1 },
  { nome: 'Druido', dadoVita: 'd8', tier: 1 },
  { nome: 'Paladino', dadoVita: 'd10', tier: 1 },
  { nome: 'Ranger', dadoVita: 'd10', tier: 2 },
  { nome: 'Stregone', dadoVita: 'd6', tier: 2 },
  { nome: 'Warlock', dadoVita: 'd8', tier: 2 },
  { nome: 'Monaco', dadoVita: 'd8', tier: 3 },
];

export interface RigaArma {
  nome: string;
  dadoDanno: string;
  categoria: 'mischia' | 'distanza';
  tier: 0 | 1 | 2 | 3;
}

export const TABELLA_ARMI: RigaArma[] = [
  { nome: 'Spada Corta', dadoDanno: '1d6', categoria: 'mischia', tier: 0 },
  { nome: 'Spada Lunga (a due mani)', dadoDanno: '1d10', categoria: 'mischia', tier: 0 },
  { nome: 'Ascia Bipenne', dadoDanno: '1d12', categoria: 'mischia', tier: 0 },
  { nome: 'Pugnale', dadoDanno: '1d4', categoria: 'mischia', tier: 0 },
  { nome: 'Arco Lungo', dadoDanno: '1d8', categoria: 'distanza', tier: 1 },
  { nome: 'Balestra Leggera', dadoDanno: '1d8', categoria: 'distanza', tier: 1 },
  { nome: 'Mazza', dadoDanno: '1d6', categoria: 'mischia', tier: 1 },
  { nome: 'Martello da Guerra (a due mani)', dadoDanno: '1d10', categoria: 'mischia', tier: 1 },
  { nome: 'Lancia (a due mani)', dadoDanno: '1d8', categoria: 'mischia', tier: 2 },
  { nome: 'Alabarda', dadoDanno: '1d10', categoria: 'mischia', tier: 2 },
  { nome: 'Balestra Pesante', dadoDanno: '1d10', categoria: 'distanza', tier: 2 },
  { nome: 'Ascia da Lancio', dadoDanno: '1d6', categoria: 'distanza', tier: 2 },
  { nome: 'Frusta', dadoDanno: '1d4', categoria: 'mischia', tier: 3 },
  { nome: 'Tridente', dadoDanno: '1d6', categoria: 'mischia', tier: 3 },
  { nome: 'Piccone da Guerra', dadoDanno: '1d8', categoria: 'mischia', tier: 3 },
  { nome: 'Fionda', dadoDanno: '1d4', categoria: 'distanza', tier: 3 },
];

export interface RigaIncantesimo {
  nome: string;
  scuola: string;
  livello: number;
  tier: 0 | 1 | 2 | 3;
}

export const TABELLA_INCANTESIMI: RigaIncantesimo[] = [
  { nome: 'Palla di Fuoco', scuola: 'Evocazione', livello: 3, tier: 0 },
  { nome: 'Cura Ferite', scuola: 'Abiurazione', livello: 1, tier: 0 },
  { nome: 'Dardo Incantato', scuola: 'Evocazione', livello: 1, tier: 0 },
  { nome: 'Scudo', scuola: 'Abiurazione', livello: 1, tier: 0 },
  { nome: 'Fulmine', scuola: 'Evocazione', livello: 3, tier: 1 },
  { nome: 'Invisibilità', scuola: 'Illusione', livello: 2, tier: 1 },
  { nome: 'Ammaliare Persone', scuola: 'Ammaliamento', livello: 1, tier: 1 },
  { nome: 'Volare', scuola: 'Trasmutazione', livello: 3, tier: 1 },
  { nome: 'Parlare con gli Animali', scuola: 'Divinazione', livello: 1, tier: 1 },
  { nome: 'Resurrezione', scuola: 'Necromanzia', livello: 5, tier: 2 },
  { nome: 'Teletrasporto', scuola: 'Convocazione', livello: 7, tier: 2 },
  { nome: 'Individuazione del Magico', scuola: 'Divinazione', livello: 1, tier: 2 },
  { nome: 'Muro di Fuoco', scuola: 'Evocazione', livello: 4, tier: 2 },
  { nome: 'Sfera Fiammeggiante', scuola: 'Evocazione', livello: 2, tier: 2 },
  { nome: 'Passo Velato', scuola: 'Convocazione', livello: 2, tier: 3 },
  { nome: 'Simbolo', scuola: 'Ammaliamento', livello: 7, tier: 3 },
  { nome: 'Banchetto dei Poveri', scuola: 'Trasmutazione', livello: 1, tier: 3 },
  { nome: 'Mani Brucianti', scuola: 'Evocazione', livello: 1, tier: 3 },
  { nome: 'Immagine Silente', scuola: 'Illusione', livello: 1, tier: 3 },
  { nome: 'Confusione', scuola: 'Ammaliamento', livello: 4, tier: 3 },
];

export interface RigaCreatura {
  nome: string;
  debolezza: string;
  tier: 0 | 1 | 2 | 3;
}

export const TABELLA_CREATURE: RigaCreatura[] = [
  { nome: 'Licantropo', debolezza: 'Argento', tier: 0 },
  { nome: 'Vampiro', debolezza: 'Luce del sole', tier: 0 },
  { nome: 'Troll', debolezza: 'Fuoco o acido', tier: 0 },
  { nome: 'Scheletro', debolezza: 'Danno contundente', tier: 0 },
  { nome: 'Basilisco', debolezza: 'Specchio (per evitare lo sguardo)', tier: 1 },
  { nome: 'Zombie', debolezza: 'Danno radiante', tier: 1 },
  { nome: 'Golem di Ferro', debolezza: 'Danno da fuoco (rallenta i suoi attacchi)', tier: 1 },
  { nome: 'Lich', debolezza: 'Distruzione del phylactery', tier: 2 },
  { nome: 'Idra', debolezza: 'Fuoco sulle ferite mozzate', tier: 2 },
  { nome: 'Spettro', debolezza: 'Danno radiante', tier: 2 },
  { nome: 'Diavolo delle Ossa', debolezza: 'Danno da santità/radiante', tier: 3 },
  { nome: 'Manticora', debolezza: 'Esaurimento degli aculei lanciati', tier: 3 },
  { nome: 'Rakshasa', debolezza: "Un'arma magica appuntita nel palmo", tier: 3 },
  { nome: 'Mummia', debolezza: 'Danno da fuoco', tier: 3 },
];

export interface RigaPiano {
  nome: string;
  descrizioneBreve: string;
  tier: 0 | 1 | 2 | 3;
}

export const TABELLA_PIANI: RigaPiano[] = [
  { nome: 'Abisso', descrizioneBreve: "il piano natio dei demoni, caotico e malvagio", tier: 0 },
  { nome: 'Piano Etereo', descrizioneBreve: 'un piano nebbioso che avvolge il piano materiale, usato per viaggi rapidi', tier: 0 },
  { nome: 'Piano Ombra', descrizioneBreve: "un riflesso oscuro e desolato del piano materiale", tier: 1 },
  { nome: 'Feywild', descrizioneBreve: 'un riflesso selvaggio e incantato del piano materiale, dominio delle fate', tier: 1 },
  { nome: 'Nove Inferi', descrizioneBreve: "il regno legale e malvagio dei diavoli, diviso in nove livelli", tier: 1 },
  { nome: 'Limbo', descrizioneBreve: 'un piano di materia caotica in perenne mutamento', tier: 2 },
  { nome: 'Monte Celestia', descrizioneBreve: 'il regno legale e buono, montagna a sette livelli', tier: 2 },
  { nome: 'Piano Astrale', descrizioneBreve: "un vuoto argenteo dove viaggiano le anime e si raggiungono altri piani", tier: 2 },
  { nome: 'Meccanus', descrizioneBreve: 'un piano di ingranaggi perfetti, ordine assoluto', tier: 3 },
  { nome: 'Bytopia', descrizioneBreve: 'il piano gemello del lavoro onesto e della bontà pacifica', tier: 3 },
];

export interface RigaAbilita {
  nome: string;
  caratteristica: string;
  tier: 0 | 1 | 2 | 3;
}

export const TABELLA_ABILITA: RigaAbilita[] = [
  { nome: 'Percezione', caratteristica: 'Saggezza', tier: 0 },
  { nome: 'Furtività', caratteristica: 'Destrezza', tier: 0 },
  { nome: 'Atletica', caratteristica: 'Forza', tier: 0 },
  { nome: 'Intimidire', caratteristica: 'Carisma', tier: 0 },
  { nome: 'Persuasione', caratteristica: 'Carisma', tier: 1 },
  { nome: 'Arcano', caratteristica: 'Intelligenza', tier: 1 },
  { nome: 'Storia', caratteristica: 'Intelligenza', tier: 1 },
  { nome: 'Intuizione', caratteristica: 'Saggezza', tier: 1 },
  { nome: 'Acrobazia', caratteristica: 'Destrezza', tier: 2 },
  { nome: 'Rapidità di Mano', caratteristica: 'Destrezza', tier: 2 },
  { nome: 'Sopravvivenza', caratteristica: 'Saggezza', tier: 2 },
  { nome: 'Addestrare Animali', caratteristica: 'Saggezza', tier: 3 },
  { nome: 'Religione', caratteristica: 'Intelligenza', tier: 3 },
  { nome: 'Inganno', caratteristica: 'Carisma', tier: 3 },
];
