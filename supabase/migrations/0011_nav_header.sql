-- =============================================================================
-- 0011_nav_header.sql — DB-driven public header navigation
-- Adds header_visible to navigation_tabs and seeds the core header tabs so the
-- public <Header> can render its top nav from the DB instead of a hardcoded list.
-- Idempotent: safe to re-run (add column IF NOT EXISTS + on conflict upsert).
-- =============================================================================

alter table public.navigation_tabs
  add column if not exists header_visible boolean not null default false;

-- Core header tabs. key is unique (see 0001), so upsert on (key) is idempotent.
-- internal tabs store their route in `slug` (leading slash), matching the
-- existing directory tabs and getVisibleTabs/resolveTabHref semantics.
-- The 챌린지 tab is intentionally NOT seeded here — admins manage it as a
-- `special` tab pointing at the challenge special_page.
insert into public.navigation_tabs
  (name, key, type, slug, is_visible, sort_order, mobile_visible, header_visible)
values
  ('프로그램',     'header_programs',      'internal', '/programs',      true, 10, true, true),
  ('일정',         'header_schedule',      'internal', '/schedule',      true, 20, true, true),
  ('시리즈',       'header_series',        'internal', '/series',        true, 30, true, true),
  ('리더보드',     'header_leaderboard',   'internal', '/leaderboard',   true, 40, true, true),
  ('온라인 리그',  'header_online_league', 'internal', '/online-league', true, 50, true, true)
on conflict (key) do update set
  name           = excluded.name,
  type           = excluded.type,
  slug           = excluded.slug,
  is_visible     = excluded.is_visible,
  sort_order     = excluded.sort_order,
  mobile_visible = excluded.mobile_visible,
  header_visible = excluded.header_visible;

create index if not exists tabs_header_idx
  on public.navigation_tabs (header_visible, sort_order);
