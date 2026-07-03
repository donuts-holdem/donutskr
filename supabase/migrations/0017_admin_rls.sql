-- =============================================================================
-- 0017_admin_rls.sql — Role-aware admin authorization (P3 security hardening)
--
-- Prior policies (0002/0003/0011/0014) treated ANY authenticated user as an
-- admin (`to authenticated using (true)`). This migration introduces an admin
-- email allowlist (public.admin_emails) + a SECURITY DEFINER is_admin() helper,
-- and recreates every write policy to require public.is_admin().
--
-- ROLLOUT ORDER (important):
--   1. Deploy the app layer (ADMIN_EMAILS env) first and confirm admins can
--      still log in and mutate.
--   2. Ensure public.admin_emails contains the real admin login email(s) — the
--      seed below is a placeholder. Admin writes only continue for emails
--      present in this table once these policies are applied.
--   3. Apply this migration. If admin_emails is empty/wrong, ALL admin writes
--      (DB + storage) will be denied.
--
-- Idempotent: safe to re-run (create table if not exists / create or replace /
-- drop policy if exists + create).
-- =============================================================================

-- Allowlist of admin login emails. RLS is enabled with NO policies, so it is
-- unreadable/unwritable by anon/authenticated clients. Only the owner-privileged
-- SECURITY DEFINER is_admin() below reads it.
create table if not exists public.admin_emails (email text primary key);
alter table public.admin_emails enable row level security;

-- Seed the current admin. TODO: 실제 관리자 로그인 이메일을 확인해 추가/수정하세요.
-- (auth.users의 로그인 이메일과 정확히 일치해야 함 — 대소문자는 무시됨.)
insert into public.admin_emails (email) values ('undefined0307@gmail.com')
  on conflict do nothing;

-- is_admin(): true when the JWT's email is in admin_emails. STABLE + SECURITY
-- DEFINER (owner reads admin_emails past its RLS) + empty search_path for safety.
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

-- Called from RLS policies evaluated as anon/authenticated, so grant execute.
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recreate every "auth write <table>" policy to require is_admin().
-- Policy name suffix == table name for all of them (0002 loop, 0003, 0014).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'seasons','blind_structures','blind_structure_rows','events',   -- 0002
    'navigation_tabs','special_pages','online_league_settings','site_config', -- 0002
    'programs',        -- 0003
    'program_options'  -- 0014
  ] loop
    execute format('drop policy if exists "auth write %s" on public.%I;', t, t);
    execute format(
      'create policy "auth write %s" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- purge_trash() hardening. 0015 granted execute to `authenticated` under the
-- old "authenticated = admin" model, letting any signed-in user hard-delete
-- trashed rows (SECURITY DEFINER bypasses the policies above). Revoke it: the
-- cron route calls it via service_role (grant retained from 0015), and
-- app-side trash operations go through server actions gated by requireAdmin()
-- + the is_admin() write policies — nothing calls this RPC as `authenticated`.
-- ---------------------------------------------------------------------------
revoke execute on function public.purge_trash() from authenticated;

-- ---------------------------------------------------------------------------
-- storage.objects (media bucket) write policies (from supabase/_apply_all_p0.sql).
-- "media public read" (select) is intentionally left unchanged.
-- ---------------------------------------------------------------------------
drop policy if exists "media auth insert" on storage.objects;
create policy "media auth insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media auth update" on storage.objects;
create policy "media auth update" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());

drop policy if exists "media auth delete" on storage.objects;
create policy "media auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());
