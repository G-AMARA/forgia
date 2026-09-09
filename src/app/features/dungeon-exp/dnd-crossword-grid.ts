import { Component, ElementRef, input, model, signal, viewChild } from '@angular/core';
import type { CellaCruciverba, DirezioneParola } from './dnd-crossword-data';

// Sotto-componente estratto da DdCrossword: gestisce SOLO il rendering della griglia e la
// navigazione (click, frecce, spazio/doppio click per cambiare direzione, digitazione con
// autoavanzamento). Il parent resta responsabile di indizi, timer e accredito XP (vedi
// dnd-crossword.ts).
@Component({
  selector: 'app-dnd-crossword-grid',
  standalone: true,
  templateUrl: './dnd-crossword-grid.html',
  styleUrl: './dnd-crossword-grid.scss',
})
export class DdCrosswordGrid {
  readonly griglia = input.required<CellaCruciverba[][]>();
  readonly celle = model.required<string[][]>();
  // true SOLO dopo "Guarda il risultato" (vedi DdCrossword.guardaRisultato()): la sfida è
  // conclusa, l'intera griglia si blocca e si colora verde/rosso in base al confronto con
  // la soluzione. Prima di quel momento nessuna cella si colora mai, nemmeno mentre si scrive.
  readonly mostraRisultato = input(false);

  private readonly contenitore = viewChild.required<ElementRef<HTMLDivElement>>('contenitore');

  protected readonly direzione = signal<DirezioneParola>('orizzontale');
  protected readonly cursoreX = signal(0);
  protected readonly cursoreY = signal(0);

  // Chiamato da (focus) — quindi anche dal focus() programmatico dell'autoavanzamento in
  // gestisciInput/muoviGriglia — perciò deve SOLO spostare il cursore logico, mai cambiare
  // direzione: prima il toggle viveva qui (controllando "click sulla stessa cella già
  // attiva"), ma muoviGriglia() imposta cursoreX/Y PRIMA di chiamare focus(), quindi ogni
  // autoavanzamento durante la digitazione soddisfaceva quella stessa condizione e faceva
  // scattare un cambio di direzione fantasma ad ogni lettera scritta. Il toggle esplicito
  // vive ora solo in cambiaDirezione(), agganciato a (dblclick) e alla barra Spazio.
  protected selezionaCella(x: number, y: number) {
    this.cursoreX.set(x);
    this.cursoreY.set(y);
  }

  protected cambiaDirezione() {
    this.direzione.set(this.direzione() === 'orizzontale' ? 'verticale' : 'orizzontale');
  }

  protected celleCorretta(x: number, y: number): boolean {
    return this.mostraRisultato() && this.celle()[y][x] === this.griglia()[y][x].lettera;
  }

  protected celleErrata(x: number, y: number): boolean {
    return this.mostraRisultato() && this.celle()[y][x] !== this.griglia()[y][x].lettera;
  }

  // Bordo di separazione rinforzato: la cella a destra ha una lettera ma NON è la
  // prosecuzione della stessa parola orizzontale di questa cella. Copre sia la fine "vera"
  // di una parola orizzontale, sia il caso meno ovvio di una cella che appartiene SOLO a una
  // parola verticale e si trova per puro caso subito a sinistra dell'inizio di una parola
  // orizzontale diversa nella stessa riga (es. l'ultima lettera di GOBLIN, verticale, accanto
  // alla prima di LADRO, orizzontale): entrambe hanno una lettera, sembrano un rigo
  // continuo, ma orizzontaleId non coincide (di fatto è null per la cella di GOBLIN).
  protected bordoDestra(x: number, y: number): boolean {
    const vicino = this.griglia()[y][x + 1];
    if (!vicino?.lettera) return false;
    const cella = this.griglia()[y][x];
    return cella.orizzontaleId === null || cella.orizzontaleId !== vicino.orizzontaleId;
  }

  // Stessa logica di bordoDestra() ma in verticale: separa due colonne di lettere che si
  // toccano senza essere la stessa parola verticale che scende.
  protected bordoBasso(x: number, y: number): boolean {
    const vicino = this.griglia()[y + 1]?.[x];
    if (!vicino?.lettera) return false;
    const cella = this.griglia()[y][x];
    return cella.verticaleId === null || cella.verticaleId !== vicino.verticaleId;
  }

  protected gestisciInput(evento: Event, x: number, y: number) {
    const valore = (evento.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z]/g, '');
    const lettera = valore.slice(-1);
    this.aggiornaCella(x, y, lettera);
    if (lettera) this.spostaCursore(x, y, 1);
  }

  protected gestisciTasto(evento: KeyboardEvent, x: number, y: number) {
    switch (evento.key) {
      case ' ':
        evento.preventDefault();
        this.cambiaDirezione();
        break;
      case 'Backspace':
        if (this.celle()[y][x]) {
          this.aggiornaCella(x, y, '');
        } else {
          evento.preventDefault();
          this.spostaCursore(x, y, -1);
        }
        break;
      case 'ArrowRight':
        evento.preventDefault();
        this.muoviGriglia(x + 1, y);
        break;
      case 'ArrowLeft':
        evento.preventDefault();
        this.muoviGriglia(x - 1, y);
        break;
      case 'ArrowDown':
        evento.preventDefault();
        this.muoviGriglia(x, y + 1);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.muoviGriglia(x, y - 1);
        break;
    }
  }

  private aggiornaCella(x: number, y: number, lettera: string) {
    this.celle.update((griglia) => {
      const copia = griglia.map((riga) => riga.slice());
      copia[y][x] = lettera;
      return copia;
    });
  }

  // Avanza/arretra di `passo` celle SOLO lungo la direzione corrente (mai cambiandola): se
  // orizzontale va a destra/sinistra, se verticale va giù/su. Salta le celle nere.
  private spostaCursore(x: number, y: number, passo: number) {
    const dx = this.direzione() === 'orizzontale' ? passo : 0;
    const dy = this.direzione() === 'verticale' ? passo : 0;
    this.muoviGriglia(x + dx, y + dy);
  }

  private muoviGriglia(x: number, y: number) {
    const griglia = this.griglia();
    if (y < 0 || y >= griglia.length || x < 0 || x >= griglia[0].length) return;
    if (!griglia[y][x].lettera) return;

    this.cursoreX.set(x);
    this.cursoreY.set(y);
    this.contenitore()
      .nativeElement.querySelector<HTMLInputElement>(`#cella-${x}-${y}`)
      ?.focus();
  }
}
