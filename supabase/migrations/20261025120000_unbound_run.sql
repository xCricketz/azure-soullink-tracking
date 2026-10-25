-- Archive the finished Azure Platinum run and open Pokémon Unbound.
-- Apply this in the Supabase SQL editor before using the Unbound build.
-- The app does not run it. Safe to run once: an already-active Unbound run is left alone.

alter table public.catches
  add column if not exists form text;

comment on column public.catches.form is
  'Form name from the Unbound dex (Alolan, Galarian, Hisuian, …). dex_id stays the national number.';

-- National numbers go past 493. Drop a Gen 1–4 ceiling if one was added by hand.
alter table public.catches drop constraint if exists catches_dex_id_check;
alter table public.catches drop constraint if exists catches_dex_id_range;

update public.runs
set active = false,
    updated_at = now()
where active = true
  and name is distinct from 'Pokémon Unbound Soul-Link';

insert into public.runs (name, rules, active, badges, level_cap)
select
  'Pokémon Unbound Soul-Link',
  $rules$Fisi's Tracker – Pokémon Unbound

• First catch on each route counts. A taken route is off limits.
• If a Pokémon faints, its soul partner faints too.
• Only linked, living pairs belong in the team.
• If the partner is boxed or the route was missed, the pair is split.
• Optional: Dupes Clause and Type Clause are under More.$rules$,
  true,
  0,
  null
where not exists (
  select 1 from public.runs where active = true
);
