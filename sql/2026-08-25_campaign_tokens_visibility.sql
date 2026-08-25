-- Fase 2D: visibilità delle pedine (il Master può nascondere un mostro non ancora
-- scoperto dal party). is_visible=false va nascosta ai giocatori non solo via CSS ma a
-- livello di riga: altrimenti basterebbe leggere direttamente campaign_tokens per
-- vedere in anticipo cosa li aspetta.
alter table campaign_tokens add column if not exists is_visible boolean not null default true;

drop policy if exists "campaign_tokens_select_owner_admin_or_member" on campaign_tokens;
create policy "campaign_tokens_select_owner_admin_or_member" on campaign_tokens for select
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (
      is_visible = true
      and campaign_id in (select campaign_id from characters where owner_id = auth.uid())
    )
  );
