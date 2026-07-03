-- 0015_purge_trash.sql
-- P1-5: 30-day trash retention. Every trash-eligible table soft-deletes via
-- `deleted_at`; this function hard-deletes rows that have sat in the trash for
-- more than 30 days. A Vercel Cron calls the /api/cron/purge-trash route once a
-- day, which invokes this via `.rpc("purge_trash")`.
--
-- Runs `security definer` so it deletes regardless of the caller's RLS grants,
-- and execute is revoked from public/anon — only the service role (used by the
-- cron route, gated by CRON_SECRET) and authenticated admins may call it.
-- blind_structure_rows are removed automatically (FK ON DELETE CASCADE, 0001).

create or replace function public.purge_trash()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.programs         where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from public.events           where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from public.seasons          where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from public.special_pages    where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from public.navigation_tabs  where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from public.blind_structures where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from public.program_options  where deleted_at is not null and deleted_at < now() - interval '30 days';
end;
$$;

revoke execute on function public.purge_trash() from public;
revoke execute on function public.purge_trash() from anon;
grant execute on function public.purge_trash() to service_role;
grant execute on function public.purge_trash() to authenticated;
