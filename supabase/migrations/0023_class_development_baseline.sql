-- Retire the former marketing CMS and demo timer domain.
-- Deploy the baseline application before applying this migration to an existing DB.
-- Take a backup before applying: the retired tables and their rows are removed.
-- Schedule/series rows, Auth users, admin authorization, and media are preserved.
-- No CASCADE: unexpected external dependencies must stop this migration.

begin;

-- Archival in DO:NUTS CLASS must retain history. Remove the old automatic purge.
drop function if exists public.purge_trash();

alter table public.events
  drop column if exists timer_event_id,
  drop column if exists timer_event_url,
  drop column if exists final_entries,
  drop column if exists final_players,
  drop column if exists result_recorded_at;

drop table if exists public.timer_logs;
drop table if exists public.timer_sessions;
drop table if exists public.program_options;
drop table if exists public.programs;
drop table if exists public.special_pages;
drop table if exists public.navigation_tabs;
drop table if exists public.online_league_settings;

alter table public.site_config
  drop column if exists leaderboard_tab_visible,
  drop column if exists leaderboard_api_url,
  drop column if exists leaderboard_personal_rank_visible;

drop type if exists public.tab_type;
drop type if exists public.league_status;

-- Fresh databases also need the bucket used by the retained image editors.
-- Existing bucket configuration and all uploaded objects are left intact.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

commit;
