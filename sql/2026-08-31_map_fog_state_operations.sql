-- Bugfix: "Scopri" su un'area già coperta non funzionava mai, perché revealed_areas e
-- covered_areas erano due liste indipendenti rese SEMPRE nello stesso ordine (prima tutte
-- le rivelazioni, poi tutte le coperture) invece che nell'ordine cronologico reale delle
-- azioni del Master: "copri" vinceva sempre su "scopri", mai il contrario. Nuova colonna
-- "operations": un'unica lista ordinata {type: 'reveal'|'cover', rect}, resa in sequenza
-- (vedi FogOfWarComponent) così l'azione più recente su una zona vince sempre, in entrambi
-- i sensi.
alter table map_fog_state add column if not exists operations jsonb not null default '[]'::jsonb;

-- Backfill best-effort per le campagne già in corso: ricostruisce operations concatenando
-- le vecchie rivelazioni seguite dalle vecchie coperture, preservando lo stato visivo
-- attuale (compreso il bug) invece di azzerare il lavoro di nebbia già fatto dai Master.
update map_fog_state
set operations = (
  coalesce(
    (select jsonb_agg(jsonb_build_object('type', 'reveal', 'rect', r))
     from jsonb_array_elements(revealed_areas) as r),
    '[]'::jsonb
  )
  ||
  coalesce(
    (select jsonb_agg(jsonb_build_object('type', 'cover', 'rect', c))
     from jsonb_array_elements(covered_areas) as c),
    '[]'::jsonb
  )
)
where operations = '[]'::jsonb
  and (jsonb_array_length(revealed_areas) > 0 or jsonb_array_length(covered_areas) > 0);

-- revealed_areas/covered_areas non sono più lette da nessun client: restano per ora come
-- rete di sicurezza, da rimuovere con una migrazione dedicata in futuro.
