-- Dungeon EXP Hub: il minigioco "Cripta degli Enigmi" (DdQuiz) assegna XP che accredita
-- davvero l'Araldica (profiles.navigation_seconds, vedi core/ranks.ts), non un punteggio
-- separato. Il limite "1 volta al giorno" NON può essere solo lato client (localStorage è
-- banale da aggirare) perché altrimenti si potrebbe gonfiare a piacere il proprio rango
-- reale e le quote che ne dipendono (get_npc_creation_limit, get_character_creation_limit).
-- Questa colonna+RPC impongono il limite lato server, sulla riga dell'utente autenticato.
alter table public.profiles
  add column if not exists dungeon_quiz_last_completed_at timestamptz;

-- +5 xp per risposta corretta, +20 xp bonus completamento (vedi DdQuiz.QUESTIONS, 5
-- domande in dd-quiz.ts). Convertita in secondi di navigazione con lo stesso rapporto di
-- EXP_PER_HOUR in ranks.ts (10 xp = 1 ora => 1 xp = 360 secondi), così il bonus si riflette
-- sul rango reale esattamente come farebbero ore di navigazione accumulate.
-- v2: stessa correzione di sql/2026-09-09_dungeon_run_xp.sql — il controllo "già giocato
-- oggi" viveva in una SELECT separata dalla UPDATE che accredita gli XP, non atomica: due
-- chiamate quasi simultanee potevano superare entrambe il controllo prima che una scrivesse
-- dungeon_quiz_last_completed_at, accreditando l'XP due volte. Ora il controllo è nella
-- WHERE della UPDATE stessa (atomico grazie al row-lock di PostgreSQL durante l'UPDATE).
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

  v_xp := p_correct * 5 + 20;
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

grant execute on function public.award_dungeon_quiz_xp(integer) to authenticated;
