-- Drop events.sort_order.
--
-- Event ordering is now purely chronological: date asc, then start_time asc,
-- then id asc as a stable tiebreaker (see lib/data/events.ts). The manual
-- sort_order column had been set to mirror the date sequence anyway, so it
-- carried no distinct ordering and is removed from the form, app code, and schema.
--
-- NOTE: other tables (programs, navigation_tabs, blind_structure_rows) keep their
-- own sort_order columns — this drops ONLY the events column.

-- Dropping the column also drops the dependent index events_sort_idx
-- (sort_order, date); add a replacement index matching the new sort order.
alter table events drop column if exists sort_order;
create index if not exists events_date_idx on public.events (date, start_time);
