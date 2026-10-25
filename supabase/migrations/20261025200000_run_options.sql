-- Phase 2 run settings. Additive only. Apply in the Supabase SQL editor.
-- Do not run this from the app. Nothing is deleted, archived, or rewritten.
--
-- Both players can already update public.runs (badges, level_cap, rules).
-- This column rides that same update path. No new policy is created here
-- because the original runs policies are not in this repo; creating a
-- permissive one blindly could widen access.

alter table public.runs
  add column if not exists options jsonb not null default '{}'::jsonb;

comment on column public.runs.options is
  'Shared run settings: randomizer toggles, difficulty, level-cap switch, Tarmigan mansion, NG+ flag and carried names, sandbox warning, species-clause scope.';
