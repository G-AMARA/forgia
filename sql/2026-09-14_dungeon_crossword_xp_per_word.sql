-- Riequilibra gli xp del cruciverba rispetto al quiz (vedi
-- 2026-09-14_dungeon_quiz_xp_no_bonus.sql, appena riportato a "5 xp per risposta corretta,
-- niente altro"): con la vecchia formula "+2/parola corretta, -1/parola sbagliata"
-- (2026-09-09_dungeon_crossword_xp.sql) 8 parole corrette su 10 (2 sbagliate) valevano 14 xp,
-- nettamente sproporzionato rispetto alle 40 xp che le stesse 8 risposte corrette varrebbero
-- nel quiz. Ora ogni parola indovinata vale semplicemente 5 xp, come una risposta corretta nel
-- quiz — nessuna penalità per le parole sbagliate o non completate. Stesso limite di 1
-- accredito al giorno e stessa conversione in secondi di navigazione (1 xp = 360s), invariati.
create or replace function public.award_dungeon_crossword_xp(p_parole_corrette integer, p_totale_parole integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
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

  v_xp := p_parole_corrette * 5;
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
