import Phaser from 'phaser';
import { CLASSI_DND, type ClasseId, type DungeonRunCallbacks, type DungeonRunInitData } from './dungeon-run-data';

// Dati e logica di gioco di "Dungeon Run" isolati dal componente Angular (DungeonRun):
// una Phaser.Scene non è un componente Angular, ma la regola di CLAUDE.md "logica fuori
// dal componente" vale comunque, qui applicata spostando l'intero Arcade Physics game
// loop in questo file. Il componente si limita a creare/distruggere il Phaser.Game, a far
// scegliere la classe D&D e ad ascoltare le callback per aggiornare la UI (HUD, cooldown,
// schermata di fine partita). Dati puri (classi, gemme totali) vivono in
// dungeon-run-data.ts, non qui: il componente li importa da lì, MAI da questo file, per
// non trascinarsi dietro "import Phaser" prima del previsto (vedi commento in quel file).
//
// NOTA ARCHITETTURA: "Riprova"/"Riavvia" NON usano scene.restart() né un reset in-place
// della scena. scene.restart() ricrea gli oggetti di gioco rieseguendo create(), ma lascia
// intatto lo stato di alcuni plugin di scena che sopravvivono al riavvio (World fisico,
// camera, tween/timer pendenti); un reset manuale in-place si è rivelato altrettanto
// fragile. La soluzione definitiva vive nel componente Angular (dungeon-run.ts): distrugge
// l'intera istanza Phaser.Game e ne crea una nuova da zero (stessa via della primissima
// partita), garantendo un reset sempre identico e verificabile.

// Asset pixel art dal pacchetto "0x72_DungeonTilesetII_v1.4" (public/dungeon-run/frames/,
// servita dalla radice / perché Angular pubblica public/ così). Sorgenti native 16px:
// SCALA le porta a un fattore di gioco leggibile sul canvas 800x450, TILE è la dimensione
// risultante di un blocco (16 * SCALA) usata per allineare la mappa a griglia.
const BASE_ASSET = '/dungeon-run/frames/';
const SCALA = 2.5;
const TILE = 16 * SCALA;

// Solo 2 classi selezionabili (vedi CLASSI_DND in dungeon-run-data.ts): il Guerriero usa lo
// sprite di un cavaliere in armatura pesante (knight_f), coerente con la sua ambientazione
// "guerriero sacro" e l'Attacco Fendente ravvicinato.
const SPRITE_PERSONAGGIO: Record<ClasseId, { idle: string; run: string }> = {
  mago: { idle: 'wizzard_m_idle_anim', run: 'wizzard_m_run_anim' },
  guerriero: { idle: 'knight_f_idle_anim', run: 'knight_f_run_anim' },
};

// Salto: v²/(2·gravità) determina l'altezza massima raggiungibile. Con la gravità di
// dungeon-run.ts (800) questo dà ~169px di altezza e ~1.3s di tempo in aria (quindi ~220px
// di gittata orizzontale a velocità di corsa): molto più dei pozzi (80px) e dei dislivelli
// fra le piattaforme (70px, vedi TIER_BASSO/TIER_ALTO), per garantire ogni salto al primo
// tentativo anche se non perfettamente calcolato.
const FORZA_SALTO = -520;

const LARGHEZZA_MONDO = 3200;
const ALTEZZA_MONDO = 450;
const TERRENO_Y = 410;

// Meccanica arcade frenetica: 60 secondi per raggiungere il forziere, altrimenti game over
// per tempo scaduto (vedi il TimerEvent creato in create() e controllato al suo scadere).
const DURATA_LIVELLO_SECONDI = 60;

// Spawn del player: NON i valori (50, 500) di un livello generico, ma quelli coerenti con
// questa mappa (inizio del primo segmento di terreno, poco sopra TERRENO_Y=410).
const GIOCATORE_SPAWN_X = 80;
const GIOCATORE_SPAWN_Y = TERRENO_Y - 100;

// Segmenti di terreno solido: i vuoti fra un segmento e il successivo sono le trappole
// "pozzo" richieste dai requisiti (cadere fuori dal mondo = game over, vedi update()).
// Larghezze/x tutte multiple di TILE (40) per allinearsi ai blocchi wall_mid da 16px. Ogni
// pozzo è largo 80px (2 tegole): con FORZA_SALTO/gravità attuali un salto in corsa copre
// ~220px in orizzontale, quindi resta ampio margine anche al primo tentativo.
const SEGMENTI_TERRENO = [
  { x: 0, larghezza: 640 },
  { x: 720, larghezza: 520 },
  { x: 1320, larghezza: 360 },
  { x: 1760, larghezza: 480 },
  { x: 2320, larghezza: 880 },
];

// Piattaforme fluttuanti su due sole quote (canvas basso, 450px). TIER_BASSO è 130px sopra
// il terreno: tolto lo spessore della piattaforma stessa (TILE=40, metà sopra/metà sotto il
// centro), restano ~110px liberi fra il pavimento e il suo bordo inferiore — più dell'altezza
// del personaggio (16x28 nativi * SCALA 2.5 = 70px), così ci si può camminare sotto senza
// incastrarsi. TIER_ALTO altri 100px sopra TIER_BASSO: entrambi i dislivelli restano ben
// dentro l'altezza di salto singola (~169px, vedi FORZA_SALTO).
// IMPORTANTE: una piattaforma TIER_ALTO è raggiungibile SOLO se sta a poca distanza
// orizzontale (max ~80px) da una piattaforma TIER_BASSO adiacente, da cui rilanciarsi con
// un secondo salto — un salto singolo da terra (410) a TIER_ALTO richiederebbe superare
// ~230px, ben oltre i 169px di altezza massima. Le piattaforme 6 e 8 stavano isolate sopra
// terreno pieno, senza alcuna piattaforma bassa vicina da cui rilanciarsi: la moneta lì
// sopra era di fatto irraggiungibile. Ora sono TIER_BASSO come tutte le altre; solo le due
// coppie (1→2 e 3→4) restano a due quote, con un gap orizzontale ridotto apposta.
const TIER_BASSO = TERRENO_Y - 130;
const TIER_ALTO = TIER_BASSO - 100;
const PIATTAFORME = [
  { x: 280, y: TIER_BASSO, larghezza: 160 },
  { x: 480, y: TIER_ALTO, larghezza: 120 }, // gap di 40px da platform1: staccabile con un salto corto
  { x: 800, y: TIER_BASSO, larghezza: 160 },
  { x: 1040, y: TIER_ALTO, larghezza: 120 }, // gap di 80px da platform3
  { x: 1400, y: TIER_BASSO, larghezza: 160 },
  { x: 1800, y: TIER_BASSO, larghezza: 160 },
  { x: 2050, y: TIER_BASSO, larghezza: 160 },
  { x: 2500, y: TIER_BASSO, larghezza: 200 },
];

// Sempre su un segmento di terreno pieno (mai su una piattaforma stretta o su un pozzo).
const POSIZIONI_SPINE = [
  { x: 900, y: TERRENO_Y - TILE / 2 },
  { x: 1900, y: TERRENO_Y - TILE / 2 },
  { x: 2600, y: TERRENO_Y - TILE / 2 },
];

// 6 goblin (3 in più rispetto a prima), sia sul terreno principale sia su due piattaforme:
// il raggio di pattuglia (distanza) resta sempre ben dentro il segmento/piattaforma di
// appartenenza, altrimenti il nemico cammina fuori bordo e cade nel pozzo accanto (nessuna
// collisione sul fondo del mondo, vedi update()), sparendo per il resto della partita.
const POSIZIONI_NEMICI = [
  { x: 350, y: TERRENO_Y - 60, distanza: 150 }, // terreno, segmento 0-640
  { x: 800, y: TIER_BASSO - 60, distanza: 60 }, // piattaforma 720-880
  { x: 1500, y: TERRENO_Y - 60, distanza: 120 }, // terreno, segmento 1320-1680
  { x: 1880, y: TIER_BASSO - 60, distanza: 60 }, // piattaforma 1800-1960
  { x: 2600, y: TERRENO_Y - 60, distanza: 180 }, // terreno, segmento 2320-3200
  { x: 2950, y: TERRENO_Y - 60, distanza: 100 }, // terreno, stesso segmento, verso il forziere
];

// 10 gemme totali: deve restare sincronizzato con NUMERO_GEMME_TOTALI (dungeon-run-data.ts)
// e con il limite p_gemme <= 10 della RPC award_dungeon_run_xp. Ogni gemma fluttua ~60px
// sopra la piattaforma/terreno più vicino.
const POSIZIONI_GEMME = [
  { x: 280, y: TIER_BASSO - 60 }, { x: 540, y: TIER_ALTO - 60 },
  { x: 550, y: TERRENO_Y - 60 }, { x: 800, y: TIER_BASSO - 60 },
  { x: 1100, y: TIER_ALTO - 60 }, { x: 1450, y: TIER_BASSO - 60 },
  { x: 1880, y: TIER_BASSO - 60 }, { x: 2130, y: TIER_BASSO - 60 },
  { x: 2600, y: TIER_BASSO - 60 }, { x: 2900, y: TERRENO_Y - 60 },
];

const FORZIERE_X = 3120;
const FORZIERE_TEXTURE_CHIUSO = 'chest_full_open_anim_f0';

type Nemico = { sprite: Phaser.Physics.Arcade.Sprite; minX: number; maxX: number };

export class DungeonRunScene extends Phaser.Scene {
  private classeId!: ClasseId;
  private callbacks!: DungeonRunCallbacks;
  private cooldownAbilitaMs = 0;
  private giocatore!: Phaser.Physics.Arcade.Sprite;
  private forziere!: Phaser.Physics.Arcade.Sprite;
  private gruppoTerreno!: Phaser.Physics.Arcade.StaticGroup;
  private gruppoPiattaforme!: Phaser.Physics.Arcade.StaticGroup;
  private gruppoSpine!: Phaser.Physics.Arcade.StaticGroup;
  private cursori!: Phaser.Types.Input.Keyboard.CursorKeys;
  private tastoW!: Phaser.Input.Keyboard.Key;
  private tastoA!: Phaser.Input.Keyboard.Key;
  private tastoD!: Phaser.Input.Keyboard.Key;
  private tastoSpazio!: Phaser.Input.Keyboard.Key;
  private tastoF!: Phaser.Input.Keyboard.Key;
  private nemici: Nemico[] = [];
  private gruppoNemici!: Phaser.Physics.Arcade.Group;
  private gruppoProiettili!: Phaser.Physics.Arcade.Group;
  private gruppoGemme!: Phaser.Physics.Arcade.StaticGroup;
  private gemmeRaccolte = 0;
  private partitaFinita = false;
  private forziereAperto = false;
  private inPausa = false;
  private direzione = 1;
  private prossimoUsoAbilita = 0;
  private prossimoAggiornamentoHud = 0;
  private secondiRimanenti = DURATA_LIVELLO_SECONDI;
  private timerLivello!: Phaser.Time.TimerEvent;

  constructor() {
    super('dungeon-run');
  }

  init(data: DungeonRunInitData) {
    this.classeId = data.classeId;
    this.callbacks = data.callbacks;
    this.cooldownAbilitaMs = CLASSI_DND.find((c) => c.id === this.classeId)?.cooldownMs ?? 3000;
  }

  // Carica SOLO gli sprite della classe scelta (init() gira prima di preload(), quindi
  // this.classeId è già disponibile): niente sprite dell'altra classe scaricati a vuoto.
  preload() {
    const sprite = SPRITE_PERSONAGGIO[this.classeId];
    this.caricaFrame(sprite.idle, 4);
    if (sprite.run !== sprite.idle) this.caricaFrame(sprite.run, 4);
    this.caricaFrame('goblin_run_anim', 4);
    this.caricaFrame('coin_anim', 4);
    this.caricaFrame('floor_spikes_anim', 4);
    this.caricaFrame('chest_full_open_anim', 3);
    this.caricaImmagine('muro', 'wall_mid.png');
  }

  // "Riprova"/"Riavvia" non richiamano create(): il componente Angular distrugge l'intero
  // Phaser.Game e ne crea uno nuovo, che riesegue init/preload/create da zero (vedi nota in
  // testa al file).
  create() {
    this.registraAnimazioni();
    this.creaTextureProcedurali();
    this.creaAmbientazione();

    this.physics.world.setBounds(0, 0, LARGHEZZA_MONDO, ALTEZZA_MONDO);
    // Nessuna collisione sul lato inferiore: cadere in un pozzo deve far uscire il
    // giocatore dal mondo (intercettato in update()), non fermarlo su un bordo invisibile.
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.gruppoTerreno = this.physics.add.staticGroup();
    for (const segmento of SEGMENTI_TERRENO) {
      this.creaBloccoSolido(this.gruppoTerreno, segmento.x, TERRENO_Y + TILE / 2, segmento.larghezza);
    }

    this.gruppoPiattaforme = this.physics.add.staticGroup();
    for (const p of PIATTAFORME) {
      this.creaBloccoSolido(this.gruppoPiattaforme, p.x, p.y, p.larghezza);
    }

    this.gruppoSpine = this.physics.add.staticGroup();
    for (const s of POSIZIONI_SPINE) {
      const spina = this.gruppoSpine.create(s.x, s.y, 'floor_spikes_anim_f0') as Phaser.Physics.Arcade.Sprite;
      spina.setScale(SCALA).refreshBody();
      spina.play('spina-anim');
    }

    const gruppoForziere = this.physics.add.staticGroup();
    this.forziere = gruppoForziere.create(FORZIERE_X, TERRENO_Y - TILE / 2, FORZIERE_TEXTURE_CHIUSO) as Phaser.Physics.Arcade.Sprite;
    this.forziere.setScale(SCALA).refreshBody();

    const spritePersonaggio = SPRITE_PERSONAGGIO[this.classeId];
    this.giocatore = this.physics.add.sprite(GIOCATORE_SPAWN_X, GIOCATORE_SPAWN_Y, `${spritePersonaggio.idle}_f0`);
    this.giocatore.setScale(SCALA);
    this.giocatore.play('player-idle');
    this.giocatore.setBounce(0.05);
    this.giocatore.setDragX(600);
    this.giocatore.setMaxVelocity(330, 600);
    // Hitbox più stretta del frame nativo (16x28): mantello/dettagli non devono contare ai
    // fini della collisione. Valori in coordinate NON scalate: Phaser applica SCALA da solo.
    (this.giocatore.body as Phaser.Physics.Arcade.Body).setSize(10, 24).setOffset(3, 3);
    this.physics.add.collider(this.giocatore, this.gruppoTerreno);
    this.physics.add.collider(this.giocatore, this.gruppoPiattaforme);

    this.gruppoGemme = this.physics.add.staticGroup();
    this.creaGemme();
    this.physics.add.overlap(
      this.giocatore,
      this.gruppoGemme,
      (_giocatore, gemma) => this.raccogliGemma(gemma as Phaser.Physics.Arcade.Sprite),
      undefined,
      this
    );

    this.gruppoNemici = this.physics.add.group();
    this.creaNemici();

    // La Palla di Fuoco del Mago attraversa più nemici sul percorso (non si distrugge
    // all'impatto, vedi lanciaPallaDiFuoco): l'overlap va registrato una volta sola sui
    // gruppi, non ricreato a ogni tiro.
    this.gruppoProiettili = this.physics.add.group();
    this.physics.add.overlap(
      this.gruppoProiettili,
      this.gruppoNemici,
      (_proiettile, nemicoSprite) => this.colpisciNemicoConProiettile(nemicoSprite as Phaser.Physics.Arcade.Sprite),
      undefined,
      this
    );

    this.physics.add.overlap(this.giocatore, this.gruppoSpine, () => this.terminaLivello(false));
    this.physics.add.overlap(this.giocatore, this.forziere, () => this.apriForziere());

    this.cameras.main.setBounds(0, 0, LARGHEZZA_MONDO, ALTEZZA_MONDO);
    this.cameras.main.startFollow(this.giocatore, true, 0.08, 0.08);

    if (this.input.keyboard) {
      this.cursori = this.input.keyboard.createCursorKeys();
      this.tastoW = this.input.keyboard.addKey('W');
      this.tastoA = this.input.keyboard.addKey('A');
      this.tastoD = this.input.keyboard.addKey('D');
      this.tastoSpazio = this.input.keyboard.addKey('SPACE');
      this.tastoF = this.input.keyboard.addKey('F');
    }

    // Timer di livello (meccanica arcade frenetica): 60 secondi per raggiungere il
    // forziere, altrimenti game over per tempo scaduto (vedi timerLivello.callback). Il
    // TimerEvent segue il ciclo di vita della scena: scene.pause() (pulsante Pausa) lo
    // sospende insieme al resto in automatico, non serve gestirlo a mano.
    this.secondiRimanenti = DURATA_LIVELLO_SECONDI;
    this.callbacks.onTimerUpdate(this.secondiRimanenti);
    this.timerLivello = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.secondiRimanenti--;
        this.callbacks.onTimerUpdate(Math.max(0, this.secondiRimanenti));
        if (this.secondiRimanenti <= 0) {
          this.terminaLivello(false, true);
        }
      },
    });

    // Il componente Angular ora mette in pausa/riprende chiamando direttamente
    // game.scene.pause('dungeon-run')/resume(...) invece di passare da un metodo di questa
    // scena: questi eventi (emessi da Phaser qualunque sia la via usata per pausare) sono
    // l'unico punto affidabile per sapere davvero se siamo in pausa, usato come guardia
    // esplicita in update() oltre allo stop del game loop che scene.pause() fa già da solo.
    this.events.on(Phaser.Scenes.Events.PAUSE, () => {
      this.inPausa = true;
      this.giocatore.setVelocity(0, 0);
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.inPausa = false;
    });
  }

  override update() {
    if (this.partitaFinita || this.inPausa) return;

    if (this.giocatore.y > ALTEZZA_MONDO + 100) {
      this.terminaLivello(false);
      return;
    }

    const velocita = 160;
    const sinistra = this.cursori.left.isDown || this.tastoA.isDown;
    const destra = this.cursori.right.isDown || this.tastoD.isDown;
    if (sinistra) {
      this.giocatore.setVelocityX(-velocita);
      this.giocatore.flipX = true;
    } else if (destra) {
      this.giocatore.setVelocityX(velocita);
      this.giocatore.flipX = false;
    } else {
      this.giocatore.setVelocityX(0);
    }
    this.direzione = this.giocatore.flipX ? -1 : 1;

    const corpo = this.giocatore.body as Phaser.Physics.Arcade.Body;
    if (corpo.blocked.down) {
      this.giocatore.play(sinistra || destra ? 'player-run' : 'player-idle', true);
    }

    const vuoleSaltare =
      Phaser.Input.Keyboard.JustDown(this.cursori.up) ||
      Phaser.Input.Keyboard.JustDown(this.tastoW) ||
      Phaser.Input.Keyboard.JustDown(this.tastoSpazio);
    if (vuoleSaltare && corpo.blocked.down) {
      this.giocatore.setVelocityY(FORZA_SALTO);
    }

    if (this.tastoF && Phaser.Input.Keyboard.JustDown(this.tastoF) && this.abilitaPronta()) {
      this.usaAbilita();
    }
    this.aggiornaHudCooldown();

    for (const nemico of this.nemici) {
      if (nemico.sprite.x <= nemico.minX) {
        nemico.sprite.setVelocityX(60);
        nemico.sprite.flipX = false;
      }
      if (nemico.sprite.x >= nemico.maxX) {
        nemico.sprite.setVelocityX(-60);
        nemico.sprite.flipX = true;
      }
    }
  }

  // ————— Abilità di classe (tasto F) —————

  private abilitaPronta(): boolean {
    return this.time.now >= this.prossimoUsoAbilita;
  }

  private usaAbilita() {
    this.prossimoUsoAbilita = this.time.now + this.cooldownAbilitaMs;
    if (this.classeId === 'mago') {
      this.lanciaPallaDiFuoco();
    } else {
      this.eseguiAttaccoFendente();
    }
  }

  // Mago - Palla di Fuoco: un proiettile che attraversa e incenerisce i nemici sul percorso.
  private lanciaPallaDiFuoco() {
    const proiettile = this.gruppoProiettili.create(
      this.giocatore.x + this.direzione * 18,
      this.giocatore.y - 4,
      'proiettile-magico'
    ) as Phaser.Physics.Arcade.Sprite;
    proiettile.setTint(0xff6b00);
    proiettile.setVelocityX(this.direzione * 420);
    (proiettile.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    proiettile.setFlipX(this.direzione < 0);

    const scia = this.add.particles(proiettile.x, proiettile.y, 'particella', {
      tint: 0xff6b00,
      speed: { min: -20, max: 20 },
      lifespan: 300,
      scale: { start: 0.9, end: 0 },
      blendMode: 'ADD',
      frequency: 20,
    });
    scia.startFollow(proiettile);

    this.time.delayedCall(900, () => {
      scia.destroy();
      if (proiettile.active) proiettile.destroy();
    });
  }

  // Guerriero - Attacco Fendente: un rapido e potente colpo di spada a corto raggio, ad
  // area di fronte al personaggio.
  private eseguiAttaccoFendente() {
    const larghezza = 90;
    const altezza = 70;
    const originX = this.direzione === 1 ? this.giocatore.x : this.giocatore.x - larghezza;
    const zona = new Phaser.Geom.Rectangle(originX, this.giocatore.y - altezza / 2, larghezza, altezza);

    for (const nemico of [...this.nemici]) {
      if (Phaser.Geom.Rectangle.Contains(zona, nemico.sprite.x, nemico.sprite.y)) {
        this.sconfiggiNemico(nemico);
      }
    }

    const flash = this.add.rectangle(originX + larghezza / 2, this.giocatore.y, larghezza, altezza, 0xe8ecf0, 0.4);
    this.tweens.add({ targets: flash, alpha: 0, duration: 220, onComplete: () => flash.destroy() });

    const scintille = this.add.particles(0, 0, 'particella', {
      tint: 0xe8ecf0,
      speed: { min: 60, max: 180 },
      lifespan: 300,
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
    scintille.explode(18, originX + larghezza / 2, this.giocatore.y);
    this.time.delayedCall(400, () => scintille.destroy());
  }

  private colpisciNemicoConProiettile(nemicoSprite: Phaser.Physics.Arcade.Sprite) {
    const nemico = this.nemici.find((n) => n.sprite === nemicoSprite);
    if (nemico) this.sconfiggiNemico(nemico);
  }

  private sconfiggiNemico(nemico: Nemico) {
    const indice = this.nemici.indexOf(nemico);
    if (indice === -1) return;
    this.nemici.splice(indice, 1);
    nemico.sprite.destroy();
  }

  // Il cooldown viene riportato alla UI Angular al massimo ogni 80ms (non a ogni frame):
  // evita di far girare change detection/signal update a 60fps per una semplice barra.
  private aggiornaHudCooldown() {
    if (this.time.now < this.prossimoAggiornamentoHud) return;
    this.prossimoAggiornamentoHud = this.time.now + 80;

    const restante = Math.max(0, this.prossimoUsoAbilita - this.time.now);
    const prontezza = this.cooldownAbilitaMs > 0 ? 1 - restante / this.cooldownAbilitaMs : 1;
    this.callbacks.onCooldownUpdate(Phaser.Math.Clamp(prontezza, 0, 1));
  }

  // ————— Nemici, gemme e forziere —————

  private creaNemici() {
    for (const pos of POSIZIONI_NEMICI) {
      const sprite = this.gruppoNemici.create(pos.x, pos.y, 'goblin_run_anim_f0') as Phaser.Physics.Arcade.Sprite;
      sprite.setScale(SCALA);
      sprite.play('nemico-run');
      sprite.setVelocityX(60);
      (sprite.body as Phaser.Physics.Arcade.Body).setSize(12, 12).setOffset(2, 3);
      this.physics.add.collider(sprite, this.gruppoTerreno);
      this.physics.add.collider(sprite, this.gruppoPiattaforme);
      this.physics.add.collider(this.giocatore, sprite, () => this.terminaLivello(false));
      this.nemici.push({ sprite, minX: pos.x - pos.distanza, maxX: pos.x + pos.distanza });
    }
  }

  // Le gemme oscillano verticalmente (tween) oltre alla loro animazione di rotazione: sono
  // corpi statici, quindi vanno risincronizzate manualmente con refreshBody() a ogni frame
  // del tween, altrimenti la hitbox resterebbe ferma alla posizione originale.
  private creaGemme() {
    POSIZIONI_GEMME.forEach((posizione, indice) => {
      const gemma = this.gruppoGemme.create(posizione.x, posizione.y, 'coin_anim_f0') as Phaser.Physics.Arcade.Sprite;
      gemma.setScale(SCALA).refreshBody();
      gemma.play('gemma-spin');

      this.tweens.add({
        targets: gemma,
        y: posizione.y - 6,
        duration: 700 + (indice % 3) * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: () => gemma.refreshBody(),
      });
    });
  }

  private raccogliGemma(gemma: Phaser.Physics.Arcade.Sprite) {
    this.tweens.killTweensOf(gemma);
    gemma.destroy();
    this.gemmeRaccolte++;
    this.callbacks.onGemCollected(this.gemmeRaccolte);
  }

  // Il forziere si apre (animazione one-shot) prima di segnalare la vittoria: terminaLivello
  // scatta a animazione conclusa ('animationcomplete'), non al primo contatto, altrimenti il
  // giocatore non vedrebbe mai l'apertura.
  private apriForziere() {
    if (this.forziereAperto) return;
    this.forziereAperto = true;
    this.forziere.play('forziere-apertura');
    this.forziere.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.terminaLivello(true));
  }

  private terminaLivello(vittoria: boolean, tempoScaduto = false) {
    if (this.partitaFinita) return;
    this.partitaFinita = true;
    this.timerLivello.remove();
    this.physics.pause();
    this.giocatore.setTint(vittoria ? 0x4f8f6b : 0x8d1b1b);
    this.callbacks.onGameEnd({ vittoria, gemme: this.gemmeRaccolte, tempoScaduto });
  }

  // ————— Ambientazione —————

  // Sfondo dark fantasy fisso rispetto alla camera (scrollFactor 0): gradiente indaco ->
  // quasi nero, colonne semitrasparenti in parallasse (scrollFactor 0.4) e torce con
  // bagliore pulsante lungo il livello (scrollFactor 1, fanno parte della mappa).
  private creaAmbientazione() {
    const larghezza = this.scale.width;
    const altezza = this.scale.height;

    const sfondo = this.make.graphics({ x: 0, y: 0 });
    sfondo.fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x12131c, 0x12131c, 1);
    sfondo.fillRect(0, 0, larghezza, altezza);
    sfondo.generateTexture('sfondo', larghezza, altezza);
    sfondo.destroy();
    this.add.image(0, 0, 'sfondo').setOrigin(0, 0).setScrollFactor(0).setDepth(-20);

    const colonna = this.make.graphics({ x: 0, y: 0 });
    colonna.fillStyle(0x2b2840, 0.4);
    colonna.fillRoundedRect(0, 0, 36, ALTEZZA_MONDO, 8);
    colonna.generateTexture('colonna', 36, ALTEZZA_MONDO);
    colonna.destroy();
    for (let x = 150; x < LARGHEZZA_MONDO; x += 500) {
      this.add.image(x, 0, 'colonna').setOrigin(0, 0).setScrollFactor(0.4).setDepth(-10);
    }

    for (let x = 250; x < LARGHEZZA_MONDO; x += 450) {
      const bagliore = this.add.image(x, TERRENO_Y - 40, 'bagliore-torcia').setDepth(-6);
      this.add.image(x, TERRENO_Y - 16, 'supporto-torcia').setDepth(-5);
      this.tweens.add({
        targets: bagliore,
        alpha: { from: 0.7, to: 1 },
        duration: 500 + (x % 300),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ————— Animazioni —————

  private registraAnimazioni() {
    const sprite = SPRITE_PERSONAGGIO[this.classeId];
    this.creaAnimazione('player-idle', sprite.idle, 4, 6);
    this.creaAnimazione('player-run', sprite.run, 4, 10);
    this.creaAnimazione('nemico-run', 'goblin_run_anim', 4, 8);
    this.creaAnimazione('gemma-spin', 'coin_anim', 4, 8);
    this.creaAnimazione('spina-anim', 'floor_spikes_anim', 4, 6);
    this.creaAnimazione('forziere-apertura', 'chest_full_open_anim', 3, 6, false);
  }

  // Ogni frame è un file immagine caricato separatamente (non uno spritesheet unico), per
  // questo ogni voce di `frames` referenzia una texture per chiave invece che un indice.
  private creaAnimazione(chiave: string, prefisso: string, numeroFrame: number, frameRate: number, loop = true) {
    if (this.anims.exists(chiave)) return;
    this.anims.create({
      key: chiave,
      frames: Array.from({ length: numeroFrame }, (_, i) => ({ key: `${prefisso}_f${i}` })),
      frameRate,
      repeat: loop ? -1 : 0,
    });
  }

  // ————— Caricamento asset —————

  private caricaFrame(prefisso: string, numero: number) {
    for (let i = 0; i < numero; i++) {
      this.caricaImmagine(`${prefisso}_f${i}`, `${prefisso}_f${i}.png`);
    }
  }

  private caricaImmagine(chiave: string, file: string) {
    if (!this.textures.exists(chiave)) {
      this.load.image(chiave, `${BASE_ASSET}${file}`);
    }
  }

  // Un blocco solido = una fila di tessere wall_mid da TILE px, non un'unica texture
  // stirata: la larghezza deve essere multipla di TILE (vedi SEGMENTI_TERRENO/PIATTAFORME).
  private creaBloccoSolido(gruppo: Phaser.Physics.Arcade.StaticGroup, xInizio: number, y: number, larghezzaPx: number) {
    const tegole = Math.round(larghezzaPx / TILE);
    for (let i = 0; i < tegole; i++) {
      gruppo.create(xInizio + i * TILE + TILE / 2, y, 'muro').setScale(SCALA).refreshBody();
    }
  }

  // Uniche texture ancora generate al volo: nessun asset del pacchetto copre la Palla di
  // Fuoco del Mago, la particella generica e le torce d'ambientazione.
  private creaTextureProcedurali() {
    this.creaTexturaProiettile();
    this.creaTexturaParticella();
    this.creaTexturaTorcia();
  }

  private creaTexturaProiettile() {
    if (this.textures.exists('proiettile-magico')) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(7, 7, 7);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(7, 7, 4);
    g.generateTexture('proiettile-magico', 14, 14);
    g.destroy();
  }

  private creaTexturaParticella() {
    if (this.textures.exists('particella')) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 3);
    g.generateTexture('particella', 12, 12);
    g.destroy();
  }

  private creaTexturaTorcia() {
    if (this.textures.exists('bagliore-torcia')) return;
    const bagliore = this.make.graphics({ x: 0, y: 0 });
    bagliore.fillStyle(0xff9d42, 0.15);
    bagliore.fillCircle(28, 28, 28);
    bagliore.fillStyle(0xff9d42, 0.3);
    bagliore.fillCircle(28, 28, 16);
    bagliore.fillStyle(0xffe3b0, 0.85);
    bagliore.fillCircle(28, 28, 6);
    bagliore.generateTexture('bagliore-torcia', 56, 56);
    bagliore.destroy();

    const supporto = this.make.graphics({ x: 0, y: 0 });
    supporto.fillStyle(0x241e1a, 1);
    supporto.fillRect(2, 0, 4, 16);
    supporto.generateTexture('supporto-torcia', 8, 16);
    supporto.destroy();
  }
}
