-- 0016_event_organizer.sql
-- Add an "organizer" (기획 단체) field to events per client feedback:
--   The calendar should stop prefixing the buy-in ("50K 도너츠 P.K.O …") and
--   instead highlight DO:NUTS-organized events. The organizer names the group
--   that planned/hosted the event (e.g. "도너츠"); "도너츠" events read gold in
--   the public calendar. Buy-in stays on list/detail views, not the calendar.
alter table public.events
  add column if not exists organizer text;
