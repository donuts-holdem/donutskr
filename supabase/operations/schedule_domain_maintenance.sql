-- Operational opt-in, after migration 0028. Not part of the immutable migration chain.
-- This job only maintains meeting waitlists and history. It never sends email.
begin;
create extension if not exists pg_cron;
select cron.schedule(
  'donuts-meetings-lifecycle',
  '* * * * *',
  'select public.maintain_club_meetings();'
);
commit;
