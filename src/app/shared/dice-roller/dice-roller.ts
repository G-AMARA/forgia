import { Component, EventEmitter, Output, ChangeDetectorRef, inject, AfterViewInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import  DiceBox from '@3d-dice/dice-box';

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

interface RolledDice {
  id: number;
  type: DiceType;
  max: number;
  result: number | null;          // Valore numerico per i calcoli
  displayResult: string | null;   // Testo formattato per la UI (es. "00")
  isRolling: boolean;
}

@Component({
  selector: 'app-dice-roller',
  imports: [CommonModule],
  templateUrl: './dice-roller.html',
  styleUrl: './dice-roller.scss',
})
export class DiceRoller implements AfterViewInit{

  private cdr = inject(ChangeDetectorRef);
  private hasRolledBefore: boolean = false;
  @Input() abilityMode: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() rollResults = new EventEmitter<number>();

  availableDice: { type: DiceType; max: number; label: string }[] = [
    { type: 'd4', max: 4, label: 'D4' },
    { type: 'd6', max: 6, label: 'D6' },
    { type: 'd8', max: 8, label: 'D8' },
    { type: 'd10', max: 10, label: 'D10' },
    { type: 'd12', max: 12, label: 'D12' },
    { type: 'd20', max: 20, label: 'D20' },
    { type: 'd100', max: 100, label: 'D100' } // Il max qui ci serve solo come etichetta
  ];

  board: RolledDice[] = [];
  rollTotal: number = 0;
  private diceIdCounter = 0;
  private diceBox: any;
  private diceBoxReady = false;
  isRolling3D = false;
  canClose: boolean = true;
  private closeTimer: any;

  ngAfterViewInit() {
    setTimeout(() => {
      this.diceBox = new DiceBox("#dice-box-container", {
        // DiceBox concatena origin + assetPath (non passa dal <base href>), serve quindi
        // il pathname assoluto risolto rispetto al base href (es. "/forgia/dice-box/assets/").
        assetPath: new URL('dice-box/assets/', document.baseURI).pathname,
        theme: 'default',
        themeColor: '#d97706',
        scale: 11,
        spinForce: 6,
        throwForce: 3,
        gravity: 2
      });

      this.diceBox.init().then(() => {
        this.diceBoxReady = true;
        console.log("Motore 3D pronto all'uso!");
        if (this.abilityMode) {
          this.loadAbilityRollPreset();
        }
      }).catch((err: any) => {
        console.error("Errore inizializzazione DiceBox", err);
      });
    }, 50);  
  }

  // NUOVO: Pre-carica esattamente 4 dadi d6 sulla plancia
  private loadAbilityRollPreset() {
    this.clearBoard();
    for (let i = 0; i < 4; i++) {
      this.board.push({
        id: this.diceIdCounter++,
        type: 'd6',
        max: 6,
        result: null,
        displayResult: null,
        isRolling: false
      });
    }
    this.cdr.detectChanges();
  }

 getRollNotationArray(t : any): string[] {
  
    const diceCounts: Record<string, number> = {};
    
    this.board.forEach(d => {
      diceCounts[d.type] = (diceCounts[d.type] || 0) + 1;
    });

    let d100Count = diceCounts['d100'] || 0;
    let d10Count = diceCounts['d10'] || 0;

    const notationArray: string[] = [];

    // Gestione della coppia percentuale D100 + D10
    const percentPairs = Math.min(d100Count, d10Count);
    if (percentPairs > 0) {
      notationArray.push(`${percentPairs}d100`);
      d100Count -= percentPairs;
      d10Count -= percentPairs;
    }
    if (d100Count > 0) notationArray.push(`${d100Count}d100`);
    if (d10Count > 0) notationArray.push(`${d10Count}d10`);

    // Aggiungiamo tutti gli altri dadi come elementi separati dell'array
    Object.entries(diceCounts).forEach(([type, count]) => {
      if (type !== 'd100' && type !== 'd10' && count > 0) {
        notationArray.push(`${count}${type}`);
      }
    });

    console.log("Array di notazione generato:", notationArray);
    return notationArray;
  }

  // Lancio con il motore 3D

  addDiceToBoard(dice: { type: DiceType; max: number }) {
    if (this.abilityMode) return;

    if (this.board.length >= 10) {
      console.warn("Hai raggiunto il limite massimo di 10 dadi per lancio.");
      return;
    }
    // 1. Se l'utente seleziona il d100, oppure se la plancia contiene già un d100, 
    // oppure se avevamo già completato un lancio precedente: svuotiamo tutto.
    if (dice.type === 'd100' || this.board.some(d => d.type === 'd100') || this.hasRolledBefore) {
      this.clearBoard();
      this.hasRolledBefore = false; // Reset del flag
    }

    // Aggiungiamo il nuovo dado alla riserva
    this.board.push({
      id: this.diceIdCounter++,
      type: dice.type,
      max: dice.max,
      result: null,
      displayResult: null,
      isRolling: false
    });

    if (this.diceBoxReady && this.diceBox) {
      this.diceBox.clear();
    }
    this.calculateTotal();
  }

  removeDice(id: number) {
    if (this.abilityMode) return;
    this.board = this.board.filter(d => d.id !== id);
    
    if (this.diceBoxReady && this.diceBox) {
      this.diceBox.clear();
    }
    this.calculateTotal();
  }

  async trigger3DRoll() {
    if (this.board.length === 0 || !this.diceBoxReady) return;
    
    this.isRolling3D = true;
    this.canClose = false;
    this.cdr.detectChanges();

    try {
      this.diceBox.clear();
    } catch (e) {}

    const notations = this.getRollNotationArray(this.board);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 50));

      const results = await this.diceBox.roll(notations);
      console.log("Risultati grezzi 3D:", results);
      let individualRolls: number[] = [];

      if (Array.isArray(results)) {
        results.forEach((group: any) => {
          if (Array.isArray(group.rolls)) {
            group.rolls.forEach((r: any) => {
              if (r && typeof r.value === 'number') {
                individualRolls.push(r.value);
              }
            });
          } else if (group && typeof group.value === 'number') {
            individualRolls.push(group.value);
          }
        });
      }

      let grandTotal = 0;

      // REGOLA DI D&D 5e: Se siamo in abilityMode (4d6), scartiamo il valore più basso!
      if (this.abilityMode && individualRolls.length === 4) {
        individualRolls.sort((a, b) => a - b); // Ordina dal più basso al più alto
        // Scartiamo il primo (indice 0) e sommiamo gli altri 3
        const keptRolls = individualRolls.slice(1);
        grandTotal = keptRolls.reduce((sum, val) => sum + val, 0);
        console.log(`Tiro 4d6: [${individualRolls.join(', ')}] -> Scartato ${individualRolls[0]}, Somma tenuti: ${grandTotal}`);
      } else {
        // Somma normale per gli altri casi
        grandTotal = individualRolls.reduce((sum, val) => sum + val, 0);
      }

      this.rollTotal = grandTotal;
      this.rollResults.emit(this.rollTotal);

      // Segniamo che il lancio è avvenuto: il prossimo click su un dado pulirà la board
      this.hasRolledBefore = true;

      this.isRolling3D = false;
      this.closeTimer = setTimeout(() => {
        this.canClose = true;
        this.cdr.detectChanges();

        // SE SIAMO IN ABILITY MODE: Chiudiamo la modale automaticamente dopo il secondo di attesa!
        if (this.abilityMode) {
          this.closeModal();
        }
      }, 2500);

      this.cdr.detectChanges();

    } catch (e) {
      console.error("Errore durante il lancio", e);
      this.isRolling3D = false;
      this.canClose = true;
      this.cdr.detectChanges();
    }
  }

  clearBoard() {
    if (this.abilityMode) return; // In modalità caratteristica non si può svuotare a mano la plancia dei 4d6

    this.board = [];
    this.rollTotal = 0;
    this.hasRolledBefore = false;
    if (this.diceBoxReady && this.diceBox) {
      this.diceBox.clear();
    }
  }

  private calculateTotal() {
    if (this.board.length === 0) {
      this.rollTotal = 0;
      return;
    }
    let total = this.board.reduce((sum, dice) => sumummers(dice.result), 0);
    function sumummers(val: number | null) {
      return val !== null ? val : 0;
    }
    this.rollTotal = total;
    this.rollResults.emit(this.rollTotal);
  }

  closeModal() {
    // Se il timer di sicurezza non è ancora scaduto, blocchiamo la chiusura
    if (!this.canClose) return;
    this.close.emit();
  }
}
