-- updated_at 자동 갱신: "최근 수정일 표시"(PDF 4.2) 요구를 만족시키기 위해
-- updated_at 컬럼이 있는 모든 테이블에 BEFORE UPDATE 트리거를 건다.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array[
    'seasons','blind_structures','events','navigation_tabs',
    'special_pages','online_league_settings','site_config','programs'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t);
  end loop;
end $$;
