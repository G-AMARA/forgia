-- Con la conferma email attiva su Supabase, subito dopo auth.signUp() non esiste ancora
-- una sessione autenticata (l'utente non ha ancora cliccato il link di conferma): l'insert
-- diretto su profiles fatto dal client (in Auth.signUp, auth.ts) falliva quindi la RLS
-- "Utente crea il proprio profilo" (with_check: id = auth.uid(), con auth.uid() nullo).
-- Spostiamo la creazione del profilo in un trigger SECURITY DEFINER su auth.users: gira
-- con privilegi elevati e non dipende da una sessione client, quindi funziona sia con
-- conferma email attiva che disattivata. nickname e is_master arrivano come metadata
-- passati a signUp({ options: { data: { nickname, is_master } } }).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, is_master)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nickname',
    coalesce((new.raw_user_meta_data ->> 'is_master')::boolean, false)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
