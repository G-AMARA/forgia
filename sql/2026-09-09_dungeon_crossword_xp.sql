-- Dungeon EXP Hub: terzo minigioco "Parole Crociate D&D & Enigmistica" (vedi
-- core/dungeon-crossword.ts e features/dungeon-exp/dnd-crossword.ts). Stessa logica
-- anti-exploit degli altri due minigiochi (sql/2026-09-09_dungeon_quiz_xp.sql,
-- sql/2026-09-09_dungeon_run_xp.sql): la correttezza della griglia è verificata interamente
-- lato client, quindi qui non ci si fida di un punteggio libero — si accredita solo in base
-- al numero di parole risolte (bounded contro il totale del puzzle) e si impone comunque un
-- solo accredito al giorno, sulla riga dell'utente autenticato.
alter table public.profiles
  add column if not exists dungeon_crossword_last_completed_at timestamptz;

-- v3: la sfida ora si conclude con un unico "Guarda il risultato" (vedi
-- DdCrossword.guardaRisultato() in dnd-crossword.ts): niente più accrediti multipli nella
-- stessa sessione, un solo tentativo (l'ultimo mostrato) viene accreditato all'uscita. La
-- formula passa da "+2/parola +10 bonus completamento" a "+2/parola corretta, -1/parola
-- sbagliata O NON completata" (le parole sbagliate sono ricavate qui, non passate dal
-- client, esattamente come p_totale_parole - p_parole_corrette lato client: un solo numero
-- fidato — quello corretto — invece di due che potrebbero non tornare). greatest(0, ...)
-- impedisce che un risultato pessimo faccia scendere navigation_seconds sotto zero.
-- p_totale_parole resta passato dal client (non hardcoded) perché puzzle futuri nel set
-- rotativo (CRUCIVERBA_DND in dnd-crossword-data.ts) potranno avere un numero diverso di
-- parole; è comunque bound a un intervallo ragionevole per restare coerente con un vero
-- cruciverba. Stessa conversione xp -> secondi di navigazione degli altri due minigiochi (1
-- xp = 360 secondi, EXP_PER_HOUR in ranks.ts: 10 xp = 1 ora). Stesso check atomico nella
-- UPDATE (non una SELECT separata) di quiz/run, per evitare doppio accredito da chiamate
-- concorrenti.
create or replace function public.award_dungeon_crossword_xp(p_parole_corrette integer, p_totale_parole integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parole_sbagliate integer;
  v_xp integer;
  v_seconds integer;
  v_new_seconds integer;
begin
  if p_totale_parole < 1 or p_totale_parole > 30 then
    raise exception 'invalid puzzle word count';
  end if;
  if p_parole_corrette < 0 or p_parole_corrette > p_totale_parole then
    raise exception 'invalid correct word count';
  end if;

  v_parole_sbagliate := p_totale_parole - p_parole_corrette;
  v_xp := greatest(0, p_parole_corrette * 2 - v_parole_sbagliate);
  v_seconds := v_xp * 360;

  update profiles
  set navigation_seconds = navigation_seconds + v_seconds,
      dungeon_crossword_last_completed_at = now()
  where id = auth.uid()
    and (dungeon_crossword_last_completed_at is null or dungeon_crossword_last_completed_at::date <> current_date)
  returning navigation_seconds into v_new_seconds;

  if v_new_seconds is null then
    raise exception 'dungeon crossword already completed today';
  end if;

  return v_new_seconds;
end;
$$;

grant execute on function public.award_dungeon_crossword_xp(integer, integer) to authenticated;
