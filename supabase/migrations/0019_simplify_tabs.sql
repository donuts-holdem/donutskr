-- 0019: simplify navigation_tabs to what the admin actually manages.
--
-- Dropped, per client feedback (tab admin was "일차원적이고 비직관적"):
--   key                 internal identifier admins had to invent; nothing reads it
--                       (the 0011 seed's on-conflict already ran).
--   start/end_show_date tab-level date windows were redundant — special-page tabs
--                       already follow the page's own show window via the
--                       getHeaderTabs cross-check.
--   home_card_*         dead feature: no public component reads these.
--
-- Ordering is now drag-and-drop on the admin list (sort_order stays).
--
-- DEPLOY ORDER: apply AFTER the app deploy that stops writing these columns
-- (older createTab inserts `key`, which this drops).
-- Idempotent: drop column if exists.
alter table public.navigation_tabs
  drop column if exists key,
  drop column if exists start_show_date,
  drop column if exists end_show_date,
  drop column if exists home_card_visible,
  drop column if exists home_card_title,
  drop column if exists home_card_desc,
  drop column if exists home_card_cta;
