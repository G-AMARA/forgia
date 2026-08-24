-- Permette agli ADMIN (profiles.is_admin) di aggiornare il profilo di QUALUNQUE utente
-- (nickname/is_master/is_admin), non solo il proprio. Prima di questa policy la RLS
-- esistente su profiles (gestita a mano su Supabase, update limitato a id = auth.uid())
-- costringeva a promuovere un admin lanciando manualmente una UPDATE via SQL Editor:
-- ora lo si fa dalla UI (Gestione > Utenti, vedi Auth.updateUserRole in auth.ts).
-- Si somma in OR alla policy esistente, senza sostituirla né rimuoverla.
create policy "profiles_update_admin" on profiles for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));
