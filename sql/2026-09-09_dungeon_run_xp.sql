-- Dungeon EXP Hub: secondo minigioco "Dungeon Run" (platformer Phaser 3, vedi
-- core/dungeon-run.ts e features/dungeon-exp/dungeon-run-scene.ts). Stessa logica
-- anti-exploit del quiz (sql/2026-09-09_dungeon_quiz_xp.sql): il gioco gira interamente
-- lato client dentro un canvas, quindi gemme raccolte e completamento riportati da Phaser
-- NON sono mai fidati ciecamente — la RPC li ricontrolla contro i limiti reali del
-- livello (10 gemme) e impone comunque un solo accredito al giorno, sulla riga
-- dell'utente autenticato.
alter table public.profiles
  add column if not exists dungeon_run_last_completed_at timestamptz;

-- Livello di Dungeon Run: 10 gemme raccolte da +1 xp l'una (NUMERO_GEMME_TOTALI in
-- dungeon-run-scene.ts), +10 xp bonus al raggiungimento del portale finale. Stessa
-- conversione xp -> secondi di navigazione del quiz (1 xp = 360 secondi, EXP_PER_HOUR in
-- ranks.ts: 10 xp = 1 ora).
-- v2: la versione precedente controllava "già giocato oggi" con una SELECT separata dalla
-- UPDATE che accredita gli XP — due statement distinti, non atomici. Due chiamate quasi
-- simultanee (doppio click che apre due istanze di gioco, due tab, un'app che invoca la RPC
-- due volte per bug) potevano superare ENTRAMBE il controllo prima che una delle due
-- scrivesse dungeon_run_last_completed_at, accreditando l'XP due volte nello stesso giorno.
-- Ora il controllo vive nella clausola WHERE della UPDATE stessa: PostgreSQL blocca la riga
-- durante l'UPDATE, quindi la seconda chiamata concorrente vede già lo stato aggiornato
-- dalla prima e la condizione non matcha più (0 righe toccate, v_new_seconds resta NULL).
create or replace function public.award_dungeon_run_xp(p_gemme integer, p_completato boolean)
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
  if p_gemme < 0 or p_gemme > 10 then
    raise exception 'invalid gem count';
  end if;

  v_xp := p_gemme * 1 + (case when p_completato then 10 else 0 end);
  v_seconds := v_xp * 360;

  update profiles
  set navigation_seconds = navigation_seconds + v_seconds,
      dungeon_run_last_completed_at = now()
  where id = auth.uid()
    and (dungeon_run_last_completed_at is null or dungeon_run_last_completed_at::date <> current_date)
  returning navigation_seconds into v_new_seconds;

  if v_new_seconds is null then
    raise exception 'dungeon run already completed today';
  end if;

  return v_new_seconds;
end;
$$;

grant execute on function public.award_dungeon_run_xp(integer, boolean) to authenticated;
