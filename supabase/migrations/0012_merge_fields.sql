-- 0012_merge_fields.sql
-- Merge redundant field pairs per client feedback + confirmed product decision:
--   events.location   + events.address        -> events.location   ("장소 (주소)")
--   special_pages.venue + special_pages.address -> special_pages.venue
--   programs.entry_link + programs.external_url  -> programs.entry_link
--
-- DESTRUCTIVE: this drops the address / external_url columns. This file is
-- authored for review only — do NOT auto-apply it against production.

-- events: fold the road address into the venue/location as "장소 (주소)".
-- coalesce covers rows where location is null but address is present.
-- 재실행 안전: 소스 컬럼(address)이 이미 drop된 뒤 재실행되면 backfill을 건너뛴다.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'address'
  ) then
    update public.events
    set location = trim(
      coalesce(location, '')
      || case when address is not null and address <> '' then ' (' || address || ')' else '' end
    )
    where address is not null and address <> '';
  end if;
end $$;
alter table public.events drop column if exists address;

-- special_pages: same pattern — fold address into venue.
-- 재실행 안전: 소스 컬럼(address)이 이미 drop된 뒤 재실행되면 backfill을 건너뛴다.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'special_pages' and column_name = 'address'
  ) then
    update public.special_pages
    set venue = trim(
      coalesce(venue, '')
      || case when address is not null and address <> '' then ' (' || address || ')' else '' end
    )
    where address is not null and address <> '';
  end if;
end $$;
alter table public.special_pages drop column if exists address;

-- programs: entry_link is the single link. Keep the external_url value only
-- where entry_link was empty (external_url used to win the card click).
-- 재실행 안전: 소스 컬럼(external_url)이 이미 drop된 뒤 재실행되면 backfill을 건너뛴다.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'programs' and column_name = 'external_url'
  ) then
    update public.programs
    set entry_link = coalesce(entry_link, external_url)
    where entry_link is null;
  end if;
end $$;
alter table public.programs drop column if exists external_url;
