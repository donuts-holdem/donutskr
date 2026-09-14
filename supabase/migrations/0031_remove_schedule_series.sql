-- Retire the public schedule/series and their dedicated operator tools.
-- Deploy the matching application and back up these tables before applying.
-- Applied migrations remain immutable. RESTRICT stops unexpected dependencies.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

drop function if exists public.activate_season(uuid);

drop table if exists public.events;
drop table if exists public.blind_structure_rows;
drop table if exists public.blind_structures;
drop table if exists public.seasons;

drop type if exists public.row_type;

notify pgrst, 'reload schema';

commit;
