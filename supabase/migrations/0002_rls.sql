-- helper: 인증 사용자 = 관리자 (단일 관리자, 공개 가입 없음)
do $$
declare t text;
begin
  foreach t in array array[
    'seasons','blind_structures','blind_structure_rows','events',
    'navigation_tabs','special_pages','online_league_settings','site_config'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "auth write %s" on public.%I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- 공개 read: 소프트삭제 제외 + 노출 조건
create policy "public read seasons" on public.seasons for select using (deleted_at is null);
create policy "public read blind_structures" on public.blind_structures for select using (deleted_at is null);
create policy "public read blind_rows" on public.blind_structure_rows for select using (true);
create policy "public read events" on public.events for select using (deleted_at is null and is_visible);
create policy "public read tabs" on public.navigation_tabs for select using (deleted_at is null and is_visible);
create policy "public read special" on public.special_pages for select using (deleted_at is null and is_visible);
create policy "public read league" on public.online_league_settings for select using (true);
create policy "public read config" on public.site_config for select using (true);
