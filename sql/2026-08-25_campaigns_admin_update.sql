-- Permette agli ADMIN (profiles.is_admin) di modificare qualunque campagna, non solo
-- quelle di cui sono owner: serve per riassegnare il Game Master (campaigns.owner_id) da
-- Gestisci Campagna (campaign-edit.ts) senza dover intervenire a mano su Supabase.
-- Si somma in OR alla policy esistente (owner_id = auth.uid(), gestita a mano su Supabase),
-- senza sostituirla né rimuoverla.
create policy "campaigns_update_admin" on campaigns for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
