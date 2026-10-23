-- Optional follow-up. players.user_id for the existing Fisi/Seri auth users
-- is already set. Apply this if those users are recreated, and to enable
-- "Run zurücksetzen" for both catch lists at once.
-- reset_run is security definer: a signed-in player may clear the shared run.

create or replace function public.link_player_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email = 'fisi@soullink.app' then
    update public.players set user_id = new.id where id = 'fisi';
  elsif new.email = 'seri@soullink.app' then
    update public.players set user_id = new.id where id = 'seri';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.link_player_from_auth();

update public.players p
set user_id = u.id
from auth.users u
where p.user_id is null
  and (
    (p.id = 'fisi' and u.email = 'fisi@soullink.app')
    or (p.id = 'seri' and u.email = 'seri@soullink.app')
  );

create or replace function public.reset_run(p_run uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_player() is null then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from public.runs where id = p_run) then
    raise exception 'run missing';
  end if;
  delete from public.catches where run_id = p_run;
end;
$$;

revoke all on function public.reset_run(uuid) from public;
grant execute on function public.reset_run(uuid) to authenticated;
