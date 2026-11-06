-- Shared notes for the two players on a run.
-- Apply in the Supabase SQL editor. Do not run this from the app.
-- The Notes tab stays quiet until this table exists.

create table if not exists public.run_notes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  player_id text not null references public.players (id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint run_notes_body_len check (char_length(body) between 1 and 2000)
);

create index if not exists run_notes_run_created_idx
  on public.run_notes (run_id, created_at);

-- Same updated_at helper the other tables use. Create it only when this
-- database does not already have public.touch_updated_at().
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'touch_updated_at'
  ) then
    create function public.touch_updated_at()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;
end $$;

drop trigger if exists run_notes_touch_updated_at on public.run_notes;
create trigger run_notes_touch_updated_at
before update on public.run_notes
for each row execute function public.touch_updated_at();

alter table public.run_notes replica identity full;

alter table public.run_notes enable row level security;

-- Both linked players share the run, the same way current_player() gates reset_run.
-- Select and insert are limited to a signed-in player. Update and delete stay on
-- the note the player wrote. No policy uses USING (true), and anon is not granted.

drop policy if exists run_notes_select on public.run_notes;
create policy run_notes_select on public.run_notes
  for select to authenticated
  using (
    public.current_player() is not null
    and exists (select 1 from public.runs r where r.id = run_id)
  );

drop policy if exists run_notes_insert on public.run_notes;
create policy run_notes_insert on public.run_notes
  for insert to authenticated
  with check (
    public.current_player() is not null
    and player_id = public.current_player()
    and exists (select 1 from public.runs r where r.id = run_id)
  );

drop policy if exists run_notes_update on public.run_notes;
create policy run_notes_update on public.run_notes
  for update to authenticated
  using (player_id = public.current_player())
  with check (player_id = public.current_player());

drop policy if exists run_notes_delete on public.run_notes;
create policy run_notes_delete on public.run_notes
  for delete to authenticated
  using (player_id = public.current_player());

grant select, insert, update, delete on public.run_notes to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'run_notes'
  ) then
    alter publication supabase_realtime add table public.run_notes;
  end if;
end $$;
