-- Atomic season activation. A single UPDATE flips the target season active and
-- all others inactive, so there is never a window with zero (or two) active
-- seasons, and soft-deleted seasons are excluded. The partial unique index
-- seasons_one_active is satisfied because uniqueness is checked at statement end.

create or replace function public.activate_season(target uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.seasons where id = target and deleted_at is null
  ) then
    raise exception 'season % not found or deleted', target;
  end if;

  update public.seasons
  set is_active = (id = target)
  where deleted_at is null;
end;
$$;
