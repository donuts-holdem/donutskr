-- Member partner directory. Content is entered by operators; no demo partners are seeded.
begin;

create function public.partner_url_valid(p_url text, p_https_only boolean default false) returns boolean
language sql immutable set search_path = '' as $$
  select p_url is not null and length(p_url) between 1 and 2048
    and p_url !~ '[[:space:][:cntrl:]\\]'
    and p_url ~ case when p_https_only then '^https://' else '^https?://' end
    and p_url ~ '^https?://[^/?#@[:space:]\\]+([/?#][^[:space:]\\]*)?$';
$$;

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  description text not null default '' check (length(description) <= 4000),
  logo_url text check (logo_url is null or public.partner_url_valid(logo_url, true)),
  url text not null check (public.partner_url_valid(url)),
  sort_order integer not null check (sort_order > 0),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint partners_sort_order_key unique (sort_order) deferrable initially deferred
);

alter table public.partners enable row level security;
revoke all on public.partners from anon, authenticated;
grant select on public.partners to authenticated;
create policy partners_member_read on public.partners for select to authenticated
  using (public.is_active_member() or public.is_admin());
create policy partners_admin_write on public.partners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Every write takes the same lock, including insertion and removal. A reorder
-- checks the complete revision snapshot so it cannot overwrite a concurrent edit.
create function public.save_partner(p_id uuid, p_expected_revision integer, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v public.partners;
  v_name text := btrim(p_payload->>'name');
  v_description text := coalesce(btrim(p_payload->>'description'), '');
  v_logo text := nullif(btrim(p_payload->>'logo_url'), '');
  v_url text := btrim(p_payload->>'url');
  v_id uuid;
begin
  if public.is_admin() is not true then raise exception 'forbidden'; end if;
  if v_name is null or length(v_name) not between 1 and 120 or length(v_description) > 4000
    or not public.partner_url_valid(v_url) or (v_logo is not null and not public.partner_url_valid(v_logo, true)) then
    raise exception 'invalid_partner';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('donuts:partners', 0));
  if p_id is null then
    if p_expected_revision is not null then raise exception 'stale_partner'; end if;
    insert into public.partners(name, description, logo_url, url, sort_order)
      select v_name, v_description, v_logo, v_url, coalesce(max(sort_order), 0) + 1 from public.partners
      returning id into v_id;
    return v_id;
  end if;
  select * into v from public.partners where id = p_id for update;
  if not found or v.revision is distinct from p_expected_revision then raise exception 'stale_partner'; end if;
  update public.partners set name = v_name, description = v_description, logo_url = v_logo, url = v_url,
    revision = revision + 1, updated_at = clock_timestamp() where id = p_id;
  return p_id;
end;
$$;

create function public.delete_partner(p_id uuid, p_expected_revision integer) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.partners;
begin
  if public.is_admin() is not true then raise exception 'forbidden'; end if;
  perform pg_advisory_xact_lock(hashtextextended('donuts:partners', 0));
  select * into v from public.partners where id = p_id for update;
  if not found or v.revision is distinct from p_expected_revision then raise exception 'stale_partner'; end if;
  delete from public.partners where id = p_id;
end;
$$;

create function public.reorder_partners(p_order jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if public.is_admin() is not true then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_order) is distinct from 'array' then raise exception 'invalid_partner_order'; end if;
  if jsonb_array_length(p_order) = 0 or exists (
    select 1 from jsonb_array_elements(p_order) entry
    where jsonb_typeof(entry) is distinct from 'object'
      or jsonb_typeof(entry->'id') is distinct from 'string'
      or entry->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(entry->'revision') is distinct from 'number'
      or entry->>'revision' !~ '^[1-9][0-9]*$'
      or length(entry->>'revision') > 10
  ) then raise exception 'invalid_partner_order'; end if;
  if exists (select 1 from jsonb_array_elements(p_order) entry where (entry->>'revision')::bigint > 2147483647)
    or (select count(distinct (entry->>'id')::uuid) from jsonb_array_elements(p_order) entry) <> jsonb_array_length(p_order)
    then raise exception 'invalid_partner_order'; end if;
  perform pg_advisory_xact_lock(hashtextextended('donuts:partners', 0));
  select count(*) into v_count from public.partners;
  if v_count <> jsonb_array_length(p_order) or exists (
    select 1 from jsonb_to_recordset(p_order) expected(id uuid, revision integer)
      left join public.partners p on p.id = expected.id
    where p.id is null or p.revision is distinct from expected.revision
  ) then raise exception 'stale_partner'; end if;
  update public.partners p set sort_order = item.position::integer,
    revision = p.revision + 1, updated_at = clock_timestamp()
    from jsonb_array_elements(p_order) with ordinality item(entry, position)
    where p.id = (item.entry->>'id')::uuid and p.sort_order <> item.position;
end;
$$;

revoke all on function public.partner_url_valid(text, boolean), public.save_partner(uuid, integer, jsonb),
  public.delete_partner(uuid, integer), public.reorder_partners(jsonb) from public, anon, authenticated;
grant execute on function public.save_partner(uuid, integer, jsonb), public.delete_partner(uuid, integer),
  public.reorder_partners(jsonb) to authenticated;

commit;
