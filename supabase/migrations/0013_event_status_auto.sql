-- 0013_event_status_auto.sql
-- P1-2: collapse events.status to an operator INTENT (auto / canceled / hidden).
-- The public-facing display status (예정 → 진행중 → 레지마감 → 완료) is now DERIVED
-- at read time from date + start_time + reg_close_time (see lib/event-status.ts),
-- so the enum's clock-driven members (scheduled/confirmed/running/reg_closed/
-- completed) no longer need to be stored.
--
-- Postgres can't ADD VALUE to an enum and use it in the same transaction, so we
-- move the column to text with a CHECK constraint instead of extending the enum.

-- Drop the enum-casting default before retyping the column.
alter table public.events alter column status drop default;

-- enum → text (preserves the current string values for the backfill below).
alter table public.events alter column status type text using status::text;

-- Fold every legacy clock-driven state into the single "auto" intent; the
-- derivation recomputes the display state from the schedule times. Manual
-- overrides (canceled / hidden) are left untouched.
update public.events
  set status = 'auto'
  where status in ('scheduled', 'confirmed', 'running', 'reg_closed', 'completed');

-- New default + guardrail: only the three stored intents are allowed.
alter table public.events alter column status set default 'auto';
alter table public.events
  add constraint events_status_check check (status in ('auto', 'canceled', 'hidden'));

-- The enum type is no longer referenced by events.status. It is still used by
-- other tables? No — only events referenced event_status, so drop it.
drop type if exists event_status;
