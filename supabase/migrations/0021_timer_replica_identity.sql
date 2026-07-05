-- 0021 — timer_sessions must replicate FULL rows.
--
-- With the default replica identity, Postgres logical replication omits
-- unchanged TOAST-stored columns from the WAL. Supabase Realtime reads the WAL
-- directly, so an UPDATE touching only entries/players would deliver
-- `structure: null` to subscribers — blanking the venue display's clock and
-- blinds until the next poll. Full replica identity ships every column on
-- every UPDATE; write volume on this table is tiny (state transitions only).
alter table public.timer_sessions replica identity full;
