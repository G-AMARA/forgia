import { Component, EventEmitter, Output, ChangeDetectorRef, inject, AfterViewInit } from '@angular/core';
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

  ngAfterViewInit() {
    setTimeout(() => {
      this.diceBox = new DiceBox("#dice-box-container", {
        assetPath: '/dice-box/assets/',
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
      }).catch((err: any) => {
        console.error("Errore inizializzazione DiceBox", err);
      });
    }, 50);  
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
    this.board = this.board.filter(d => d.id !== id);
    
    if (this.diceBoxReady && this.diceBox) {
      this.diceBox.clear();
    }
    this.calculateTotal();
  }

  async trigger3DRoll() {
    if (this.board.length === 0 || !this.diceBoxReady) return;
    
    this.isRolling3D = true;
    this.cdr.detectChanges();

    try {
      this.diceBox.clear();
    } catch (e) {}

    const notations = this.getRollNotationArray(this.board);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 50));

      const results = await this.diceBox.roll(notations);
      console.log("Risultati grezzi 3D:", results);

      let grandTotal = 0;

      if (Array.isArray(results)) {
        results.forEach((group: any) => {
          if (Array.isArray(group.rolls)) {
            group.rolls.forEach((r: any) => {
              if (r && typeof r.value === 'number') {
                grandTotal += r.value;
              }
            });
          } else if (group && typeof group.value === 'number') {
            grandTotal += group.value;
          }
        });
      }

      this.rollTotal = grandTotal;
      this.rollResults.emit(this.rollTotal);

      // Segniamo che il lancio è avvenuto: il prossimo click su un dado pulirà la board
      this.hasRolledBefore = true;

      this.isRolling3D = false;
      this.cdr.detectChanges();

    } catch (e) {
      console.error("Errore durante il lancio", e);
      this.isRolling3D = false;
      this.cdr.detectChanges();
    }
  }

  clearBoard() {
    this.board = [];
    this.rollTotal =0;
    this.hasRolledBefore = false; // Reset dello stato
    if (this.diceBoxReady && this.diceBox) {
      this.diceBox.clear();
    }
  }

  private calculateTotal() {
    if (this.board.length === 0) {
      this.rollTotal = 0;
      return;
    }

    // Somma dei valori dei dadi che hanno un risultato valido
    let total = this.board.reduce((sum, dice) => sumummers(dice.result), 0);

    // Funzione interna sicura per sommare solo numeri validi
    function sumummers(val: number | null) {
      return val !== null ? val : 0;
    }

    this.rollTotal = total;
    this.rollResults.emit(this.rollTotal);
  }

  closeModal() {
    this.close.emit();
  }
}
