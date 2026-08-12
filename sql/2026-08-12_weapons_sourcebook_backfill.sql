-- Se hai già eseguito 2026-08-12_weapons_sourcebook_code.sql questa riga è un no-op.
alter table weapons add column if not exists sourcebook_code text references sourcebooks(code);

-- Prima d'ora la colonna weapons.sourcebook_code non esisteva: nessun salvataggio da Gestione
-- poteva quindi mai essere andato a buon fine, quindi ogni riga attuale in weapons è SRD/import,
-- non homebrew. Le valorizziamo con lo stesso codice sourcebook più usato in equipment (quello
-- del materiale base non-homebrew), così modificare un'arma esistente non la marca erroneamente
-- come homebrew (weapon-create.ts, in mancanza di un editingSourcebookCode preesistente, la
-- salverebbe con sourcebook_code = 'homebrew').
update weapons set sourcebook_code = (
  select sourcebook_code
  from equipment
  where sourcebook_code is not null and sourcebook_code <> 'homebrew'
  group by sourcebook_code
  order by count(*) desc
  limit 1
)
where sourcebook_code is null;

-- verifica
select sourcebook_code, count(*) from weapons group by sourcebook_code;
