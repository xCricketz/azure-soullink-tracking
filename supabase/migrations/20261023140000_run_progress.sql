-- Orden and Levelcap live on the shared run. Do not apply from the app.
-- runs_update already lets any signed-in player (Fisi or Seri) update a run,
-- so both can edit these columns. No new policy.

alter table public.runs
  add column if not exists badges smallint not null default 0,
  add column if not exists level_cap smallint;

alter table public.runs drop constraint if exists runs_badges_range;
alter table public.runs
  add constraint runs_badges_range check (badges between 0 and 8);

alter table public.runs drop constraint if exists runs_level_cap_range;
alter table public.runs
  add constraint runs_level_cap_range check (level_cap is null or level_cap between 1 and 100);

-- Login cards are shown before a session exists. This returns only badge count,
-- last activity, and up to six team dex ids for the active run.
create or replace function public.login_preview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with active as (
    select id, badges
    from public.runs
    where active
    order by updated_at desc
    limit 1
  ),
  teams as (
    select
      c.player,
      max(c.updated_at) as last_at,
      count(*) filter (where c.in_team and c.status = 'alive') as team_count,
      (
        array_agg(c.dex_id order by c.team_order nulls last, c.created_at)
          filter (where c.in_team and c.status = 'alive' and c.dex_id is not null)
      )[1:6] as dex_ids
    from public.catches c
    join active a on a.id = c.run_id
    group by c.player
  )
  select jsonb_build_object(
    'badges', coalesce((select badges from active), 0),
    'players', coalesce((
      select jsonb_object_agg(
        player,
        jsonb_build_object(
          'last_at', last_at,
          'team_count', team_count,
          'dex_ids', to_jsonb(dex_ids)
        )
      )
      from teams
    ), '{}'::jsonb)
  );
$$;

revoke all on function public.login_preview() from public;
grant execute on function public.login_preview() to anon, authenticated;
