-- Rimuove il bonus fisso di completamento del quiz "Cripta degli Enigmi" (+20 xp
-- indipendentemente dal risultato, vedi 2026-09-09_dungeon_quiz_xp.sql): con 2/5 risposte
-- corrette si ottenevano comunque 30 xp (2*5+20), percepito come troppo generoso. Ora gli xp
-- premiano solo le risposte effettivamente indovinate: 5 xp per risposta corretta, 0 se non ne
-- indovini nessuna. Stesso limite di 1 tentativo al giorno e stessa conversione in secondi di
-- navigazione (1 xp = 360s, vedi EXP_PER_HOUR in ranks.ts), invariati.
create or replace function public.award_dungeon_quiz_xp(p_correct integer)
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
  if p_correct < 0 or p_correct > 5 then
    raise exception 'invalid answer count';
  end if;

  v_xp := p_correct * 5;
  v_seconds := v_xp * 360;

  update profiles
  set navigation_seconds = navigation_seconds + v_seconds,
      dungeon_quiz_last_completed_at = now()
  where id = auth.uid()
    and (dungeon_quiz_last_completed_at is null or dungeon_quiz_last_completed_at::date <> current_date)
  returning navigation_seconds into v_new_seconds;

  if v_new_seconds is null then
    raise exception 'dungeon quiz already completed today';
  end if;

  return v_new_seconds;
end;
$$;
