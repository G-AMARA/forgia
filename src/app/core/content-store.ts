import { Injectable, inject, signal } from '@angular/core';
import { Supabase } from './supabase';
import { LocaleService } from './locale';

// Nome delle tabelle di reference che supportano traduzione.
// Estendi questo tipo via via che aggiungi classes, spells, ecc.
export type ContentTable =
  | 'races'
  | 'classes'
  | 'subclasses'
  | 'backgrounds'
  | 'spells'
  | 'equipment'
  | 'feats'
  | 'weapons';

export interface LocalizedContent {
  id: string;
  name: string; // già risolto: tradotto se disponibile, altrimenti fallback inglese
  description?: string;
  raw: any; // dato originale completo (raw_srd + tutte le colonne), per chi serve il dettaglio
}

// races.ability_bonuses arriva in due formati diversi a seconda dell'origine del dato:
// - razze importate dall'SRD 5e: array [{ bonus, ability_score: { index: 'str', ... } }, ...]
// - razze homebrew create da Gestione > Razze: oggetto piatto { str: 2, cha: 1, ... }
// Questa funzione normalizza entrambi nello stesso formato piatto per il resto dell'app.
export function normalizeAbilityBonuses(raw: any): Record<string, number> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    return Object.fromEntries(
      raw
        .map((entry: any): [string, number] => [entry.ability_score?.index, entry.bonus])
        .filter(([key]) => !!key)
    );
  }
  return raw;
}

@Injectable({ providedIn: 'root' })
export class ContentStore {
  private supabase = inject(Supabase);
  private localeService = inject(LocaleService);

  // Cache in memoria: chiave = `${table}:${locale}`, valore = signal con i dati
  private cache = new Map<string, ReturnType<typeof signal<LocalizedContent[]>>>();

  /**
   * Restituisce un signal con i contenuti richiesti, già localizzati.
   * Se non è in cache, avvia il fetch (async) e popola il signal quando arriva.
   * Il signal parte vuoto e si aggiorna da solo: nei template usalo con @for as usual.
   */
  getContent(table: ContentTable): ReturnType<typeof signal<LocalizedContent[]>> {
    const locale = this.localeService.locale();
    const cacheKey = `${table}:${locale}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const contentSignal = signal<LocalizedContent[]>([]);
    this.cache.set(cacheKey, contentSignal);
    this.fetchAndMerge(table, locale, contentSignal);

    return contentSignal;
  }

  /** Forza un refresh (es. dopo aver aggiunto homebrew), ignorando la cache. */
  invalidate(table: ContentTable) {
    const locale = this.localeService.locale();
    this.cache.delete(`${table}:${locale}`);
  }

  /**
   * Ricarica i dati e li scrive sullo STESSO signal già in cache (invece di invalidate()
   * + getContent(), che ne crea uno nuovo): più affidabile dopo insert/update/delete in
   * Gestione, perché i template che già leggono il vecchio signal si aggiornano subito
   * senza bisogno di ricaricare la pagina. Restituisce la Promise per poterla attendere.
   */
  async refresh(table: ContentTable): Promise<void> {
    const locale = this.localeService.locale();
    const cacheKey = `${table}:${locale}`;

    let contentSignal = this.cache.get(cacheKey);
    if (!contentSignal) {
      contentSignal = signal<LocalizedContent[]>([]);
      this.cache.set(cacheKey, contentSignal);
    }

    await this.fetchAndMerge(table, locale, contentSignal);
  }

  private async fetchAndMerge(
    table: ContentTable,
    locale: string,
    target: ReturnType<typeof signal<LocalizedContent[]>>
  ) {
    // 1. Dati base (sempre in inglese, struttura canonica)
    const { data: baseRows, error: baseError } = await this.supabase.client
      .from(table)
      .select('*')
      .order('name');

    if (baseError) {
      console.error(`ContentStore: errore fetch ${table}`, baseError.message);
      return;
    }

    // 2. Traduzioni per la lingua corrente (se locale = 'en', saltiamo: il base è già inglese)
    let translations: Record<string, { name?: string; description?: string; data?: any }> = {};

    if (locale !== 'en' && baseRows && baseRows.length > 0) {
      const ids = baseRows.map((r) => r.id);
      const { data: translationRows, error: translationError } = await this.supabase.client
        .from('content_translations')
        .select('content_id, name, description, data')
        .eq('content_table', table)
        .eq('locale', locale)
        .in('content_id', ids);

      if (translationError) {
        console.error(`ContentStore: errore fetch traduzioni ${table}`, translationError.message);
      } else if (translationRows) {
        translations = Object.fromEntries(translationRows.map((t) => [t.content_id, t]));
      }
    }

    // 3. Merge: traduzione se presente, altrimenti fallback al dato base inglese
    const merged: LocalizedContent[] = (baseRows ?? []).map((row) => {
      const translation = translations[row.id];
      return {
        id: row.id,
        name: translation?.name ?? row.name,
        description: translation?.description ?? row.description ?? undefined,
        raw: { ...row, translatedData: translation?.data ?? null },
      };
    });

    target.set(merged);
  }
}
