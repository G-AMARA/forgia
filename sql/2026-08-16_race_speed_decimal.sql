alter table public.races
  alter column speed type numeric(4, 1) using speed::numeric(4, 1);
