-- =============================================================================
-- 0020_timer_sessions.sql — Tournament timer sessions + audit logs.
--
-- A timer_session is the live clock state for a running tournament. The clock is
-- derived client-side from an anchor model (started_at + elapsed_offset_sec), so
-- the DB stores state, not a ticking value. Optimistic concurrency via `version`
-- (server actions guard `.eq("version", n)` and bump it). timer_logs is an
-- append-only admin audit trail of every mutation.
-- =============================================================================

-- Result snapshot fields on events, populated when a timer finishes.
alter table public.events add column if not exists starting_stack int;
alter table public.events add column if not exists final_entries int;
alter table public.events add column if not exists final_players int;
alter table public.events add column if not exists result_recorded_at timestamptz;

create table if not exists public.timer_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  buy_in text,
  starting_stack int,
  structure jsonb not null default '[]',
  status text not null default 'paused' check (status in ('running','paused','finished')),
  started_at timestamptz,
  elapsed_offset_sec int not null default 0,
  level_index int not null default 0,
  entries int not null default 0 check (entries >= 0),
  players int not null default 0 check (players >= 0),
  reg_close_level int,
  prizes jsonb not null default '[]',
  finished_at timestamptz,
  version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- At most one live (non-finished, non-deleted) timer per event.
create unique index if not exists timer_sessions_one_live_per_event on public.timer_sessions(event_id)
  where status <> 'finished' and deleted_at is null and event_id is not null;

create table if not exists public.timer_logs (
  id uuid primary key default gen_random_uuid(),
  timer_id uuid not null references public.timer_sessions(id) on delete cascade,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists timer_logs_idx on public.timer_logs (timer_id, created_at);

-- updated_at auto-refresh, reusing the shared trigger fn from 0004.
drop trigger if exists set_updated_at on public.timer_sessions;
create trigger set_updated_at before update on public.timer_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (mirrors 0017 admin model: public read, is_admin() writes).
-- ---------------------------------------------------------------------------
alter table public.timer_sessions enable row level security;
alter table public.timer_logs enable row level security;

-- timer_sessions: anyone may read a non-deleted session (public display page).
drop policy if exists "public read timer_sessions" on public.timer_sessions;
create policy "public read timer_sessions" on public.timer_sessions
  for select using (deleted_at is null);
drop policy if exists "auth write timer_sessions" on public.timer_sessions;
create policy "auth write timer_sessions" on public.timer_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- timer_logs: admin-only, no public read.
drop policy if exists "admin read timer_logs" on public.timer_logs;
create policy "admin read timer_logs" on public.timer_logs
  for select to authenticated using (public.is_admin());
drop policy if exists "admin insert timer_logs" on public.timer_logs;
create policy "admin insert timer_logs" on public.timer_logs
  for insert to authenticated with check (public.is_admin());

-- Realtime: the display + control pages subscribe to row UPDATEs.
-- Guarded: re-adding a table already in the publication raises an error.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'timer_sessions'
  ) then
    alter publication supabase_realtime add table public.timer_sessions;
  end if;
end $$;
