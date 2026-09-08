-- Additive membership foundation. No schedule/series tables are changed.
-- Apply separately from the historical cleanup migration. Signup starts CLOSED.
-- Passwords and email verification remain entirely in Supabase Auth.
begin;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 120),
  active boolean not null default true,
  sort_order integer not null default 0
);

-- These catalogs support enrollment first. Session/meeting operations follow
-- in separate migrations; neither catalog replaces public.events or seasons.
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 120),
  place text not null check (char_length(btrim(place)) between 1 and 200),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 120),
  school_id uuid not null references public.schools(id),
  description text not null default '',
  logo_url text,
  created_at timestamptz not null default now()
);

create table public.membership_settings (
  singleton boolean primary key default true check (singleton),
  signup_open boolean not null default false,
  consent_version text,
  privacy_url text,
  check (not signup_open or (
    consent_version is not null and char_length(btrim(consent_version)) between 1 and 80
    and privacy_url is not null and privacy_url ~ '^https://[^[:space:]]+$'
  ))
);
insert into public.membership_settings (singleton) values (true);

create table public.member_profiles (
  id uuid primary key references auth.users(id),
  username text not null unique check (username ~ '^[a-z][a-z0-9_]{3,23}$'),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  school_id uuid references public.schools(id),
  other_school_name text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'WITHDRAWN')),
  consented_at timestamptz not null default now(),
  consent_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((school_id is not null and other_school_name is null) or
    (school_id is null and other_school_name is not null
      and char_length(btrim(other_school_name)) between 1 and 120))
);

create table public.class_leaders (
  class_id uuid not null references public.classes(id),
  user_id uuid not null references public.member_profiles(id),
  assigned_by uuid not null references auth.users(id),
  assigned_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create table public.club_leaders (
  club_id uuid not null references public.clubs(id),
  user_id uuid not null references public.member_profiles(id),
  assigned_by uuid not null references auth.users(id),
  assigned_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index class_leaders_user_idx on public.class_leaders(user_id);
create index club_leaders_user_idx on public.club_leaders(user_id);

create table public.class_memberships (
  class_id uuid not null references public.classes(id),
  user_id uuid not null references public.member_profiles(id),
  joined_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (class_id, user_id)
);
create table public.club_memberships (
  club_id uuid not null references public.clubs(id),
  user_id uuid not null references public.member_profiles(id),
  joined_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (club_id, user_id)
);
create index class_memberships_user_idx on public.class_memberships(user_id);
create index club_memberships_user_idx on public.club_memberships(user_id);

create table public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_profiles(id),
  requested_school_id uuid references public.schools(id),
  requested_other_school text,
  requested_class_id uuid not null references public.classes(id),
  requested_club_id uuid references public.clubs(id),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  consent_version text not null,
  privacy_url text not null,
  consented_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_reason text check (char_length(decision_reason) <= 500),
  created_at timestamptz not null default now(),
  check ((requested_school_id is not null and requested_other_school is null) or
    (requested_school_id is null and requested_other_school is not null
      and char_length(btrim(requested_other_school)) between 1 and 120)),
  check ((status = 'PENDING' and decided_by is null and decided_at is null) or
    (status <> 'PENDING' and decided_by is not null and decided_at is not null))
);
create unique index signup_requests_one_pending on public.signup_requests(user_id) where status = 'PENDING';
create index signup_requests_user_created_idx on public.signup_requests(user_id, created_at desc);
create index signup_requests_class_idx on public.signup_requests(requested_class_id, status);
create index signup_requests_club_idx on public.signup_requests(requested_club_id, status);

create table public.membership_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_profiles(id),
  actor_id uuid not null references auth.users(id),
  request_id uuid references public.signup_requests(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index membership_audit_user_idx on public.membership_audit_log(user_id, created_at desc);

-- Only a server-side service-role client can access this ephemeral throttle.
create table public.membership_auth_limits (
  attempt_key text primary key check (attempt_key ~ '^[a-f0-9]{64}$'),
  bucket_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 11)
);
create index membership_auth_limits_expiry_idx on public.membership_auth_limits(bucket_start);

create function public.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.member_profiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.status = 'ACTIVE' and u.email_confirmed_at is not null
  )
$$;

create function public.can_review_signup(p_class_id uuid, p_club_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (public.is_active_member() and (
    exists (select 1 from public.class_leaders l where l.user_id = auth.uid() and l.class_id = p_class_id)
    or exists (select 1 from public.club_leaders l where l.user_id = auth.uid() and l.club_id = p_club_id)
  ))
$$;

create function public.can_read_member(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() = p_user_id or public.is_admin() or (
    public.is_active_member() and (
      exists (select 1 from public.signup_requests r where r.user_id = p_user_id
        and r.status = 'PENDING' and public.can_review_signup(r.requested_class_id, r.requested_club_id))
      or exists (select 1 from public.class_memberships m join public.class_leaders l using (class_id)
        where m.user_id = p_user_id and m.active and l.user_id = auth.uid())
      or exists (select 1 from public.club_memberships m join public.club_leaders l using (club_id)
        where m.user_id = p_user_id and m.active and l.user_id = auth.uid())
    )
  )
$$;

do $$
declare t text;
begin
  foreach t in array array['schools', 'classes', 'clubs', 'membership_settings',
    'member_profiles', 'class_leaders', 'club_leaders', 'class_memberships',
    'club_memberships', 'signup_requests', 'membership_audit_log', 'membership_auth_limits']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select on public.schools, public.classes, public.clubs, public.membership_settings to anon, authenticated;
grant insert, update on public.schools, public.classes, public.clubs, public.membership_settings to authenticated;
grant select on public.member_profiles, public.class_leaders, public.club_leaders,
  public.class_memberships, public.club_memberships, public.signup_requests, public.membership_audit_log to authenticated;

create policy schools_read on public.schools for select to anon, authenticated
  using (active or public.is_admin() or public.is_active_member());
create policy schools_admin on public.schools for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy classes_read on public.classes for select to anon, authenticated
  using (active or public.is_admin() or public.is_active_member());
create policy classes_admin on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy clubs_read on public.clubs for select to anon, authenticated using (true);
create policy clubs_admin on public.clubs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy membership_settings_read on public.membership_settings for select to anon, authenticated using (true);
create policy membership_settings_admin on public.membership_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy member_profiles_read on public.member_profiles for select to authenticated
  using (public.can_read_member(id));
create policy class_leaders_read on public.class_leaders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy club_leaders_read on public.club_leaders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy class_memberships_read on public.class_memberships for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or (public.is_active_member() and exists (
    select 1 from public.class_leaders l where l.class_id = class_memberships.class_id and l.user_id = auth.uid()
  )));
create policy club_memberships_read on public.club_memberships for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or (public.is_active_member() and exists (
    select 1 from public.club_leaders l where l.club_id = club_memberships.club_id and l.user_id = auth.uid()
  )));
create policy signup_requests_read on public.signup_requests for select to authenticated
  using (user_id = auth.uid() or public.can_review_signup(requested_class_id, requested_club_id));
create policy membership_audit_read on public.membership_audit_log for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Internal implementation shared by the Auth trigger and authenticated retry.
-- Caller identity never comes from the submitted JSON. Metadata cannot set roles
-- or approval status. All catalog and consent checks also execute in the DB.
create function public.create_membership_application(p_user_id uuid, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  settings public.membership_settings%rowtype;
  profile public.member_profiles%rowtype;
  school uuid := nullif(p_payload ->> 'school_id', '')::uuid;
  class_id_value uuid := nullif(p_payload ->> 'class_id', '')::uuid;
  club uuid := nullif(p_payload ->> 'club_id', '')::uuid;
  other_school text := nullif(btrim(p_payload ->> 'other_school_name'), '');
  request_id uuid;
begin
  if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'invalid_application';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 24));
  if exists (select 1 from auth.users u join public.admin_emails a on lower(a.email) = lower(u.email)
    where u.id = p_user_id) then raise exception 'admin_account'; end if;

  select * into settings from public.membership_settings where singleton for share;
  if settings.signup_open is distinct from true then raise exception 'membership_closed'; end if;
  if p_payload ->> 'consent' is distinct from 'true'
    or p_payload ->> 'consent_version' is distinct from settings.consent_version then
    raise exception 'terms_changed';
  end if;
  perform 1 from public.classes where id = class_id_value and active for share;
  if not found then raise exception 'invalid_class'; end if;
  if school is not null then
    perform 1 from public.schools where id = school and active for share;
    if not found then raise exception 'invalid_school'; end if;
    other_school := null;
  elsif other_school is null then raise exception 'invalid_school'; end if;
  if club is not null then
    perform 1 from public.clubs where id = club and school_id = school for share;
    if not found then raise exception 'invalid_club'; end if;
  end if;

  select * into profile from public.member_profiles where id = p_user_id for update;
  if found and profile.status <> 'PENDING' then raise exception 'member_status_blocked'; end if;
  if exists (select 1 from public.signup_requests where user_id = p_user_id and status = 'PENDING') then
    raise exception 'duplicate_pending';
  end if;
  insert into public.member_profiles (id, username, name, phone, school_id, other_school_name, consent_version)
  values (p_user_id, lower(btrim(p_payload ->> 'username')), btrim(p_payload ->> 'name'),
    p_payload ->> 'phone', school, other_school, settings.consent_version)
  on conflict (id) do update set username = excluded.username, name = excluded.name,
    phone = excluded.phone, school_id = excluded.school_id, other_school_name = excluded.other_school_name,
    consented_at = now(), consent_version = excluded.consent_version, updated_at = now();

  insert into public.signup_requests (user_id, requested_school_id, requested_other_school,
    requested_class_id, requested_club_id, consent_version, privacy_url)
  values (p_user_id, school, other_school, class_id_value, club, settings.consent_version, settings.privacy_url)
  returning id into request_id;
  insert into public.membership_audit_log (user_id, actor_id, request_id, action)
    values (p_user_id, p_user_id, request_id, 'APPLICATION_SUBMITTED');
  return request_id;
end
$$;

create function public.submit_membership_application(p_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  perform 1 from auth.users where id = auth.uid() and email_confirmed_at is not null for share;
  if not found then raise exception 'email_not_verified'; end if;
  return public.create_membership_application(auth.uid(), p_payload);
end
$$;

create function public.handle_donuts_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ? 'donuts_membership' then
    perform public.create_membership_application(new.id, new.raw_user_meta_data -> 'donuts_membership');
  end if;
  return new;
end
$$;
create trigger donuts_membership_signup after insert on auth.users
  for each row execute function public.handle_donuts_signup();

create function public.review_signup_request(p_request_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  request public.signup_requests%rowtype;
  profile public.member_profiles%rowtype;
  reason text := nullif(btrim(p_reason), '');
  administrator boolean;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if p_decision is null or p_decision not in ('APPROVED', 'REJECTED')
    or char_length(reason) > 500 or (p_decision = 'REJECTED' and reason is null) then
    raise exception 'invalid_decision';
  end if;
  select * into request from public.signup_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if request.user_id = auth.uid() then raise exception 'self_approval_forbidden'; end if;
  if not public.can_review_signup(request.requested_class_id, request.requested_club_id) then
    raise exception 'forbidden';
  end if;

  administrator := public.is_admin();
  if not administrator then
    perform 1 from public.member_profiles where id = auth.uid() and status = 'ACTIVE' for share;
    if not found then raise exception 'forbidden'; end if;
    perform 1 from public.class_leaders where user_id = auth.uid()
      and class_id = request.requested_class_id for share;
    if not found then
      perform 1 from public.club_leaders where user_id = auth.uid()
        and club_id = request.requested_club_id for share;
      if not found then raise exception 'forbidden'; end if;
    end if;
  end if;
  if request.status = p_decision then return; end if;
  if request.status <> 'PENDING' then raise exception 'already_reviewed'; end if;
  select * into profile from public.member_profiles where id = request.user_id for update;
  if profile.status is distinct from 'PENDING' then raise exception 'member_status_blocked'; end if;

  if p_decision = 'APPROVED' then
    perform 1 from auth.users where id = request.user_id and email_confirmed_at is not null for share;
    if not found then raise exception 'email_not_verified'; end if;
    perform 1 from public.classes where id = request.requested_class_id and active for share;
    if not found then raise exception 'invalid_class'; end if;
    if request.requested_school_id is not null then
      perform 1 from public.schools where id = request.requested_school_id and active for share;
      if not found then raise exception 'invalid_school'; end if;
    end if;
    if request.requested_club_id is not null then
      perform 1 from public.clubs where id = request.requested_club_id
        and school_id = request.requested_school_id for share;
      if not found then raise exception 'invalid_club'; end if;
    end if;
    update public.member_profiles set status = 'ACTIVE', school_id = request.requested_school_id,
      other_school_name = request.requested_other_school, updated_at = now() where id = request.user_id;
    insert into public.class_memberships (class_id, user_id) values (request.requested_class_id, request.user_id)
      on conflict (class_id, user_id) do update set active = true;
    if request.requested_club_id is not null then
      insert into public.club_memberships (club_id, user_id) values (request.requested_club_id, request.user_id)
        on conflict (club_id, user_id) do update set active = true;
    end if;
  end if;
  update public.signup_requests set status = p_decision, decided_by = auth.uid(),
    decided_at = now(), decision_reason = reason where id = request.id;
  insert into public.membership_audit_log (user_id, actor_id, request_id, action, details)
    values (request.user_id, auth.uid(), request.id, 'APPLICATION_' || p_decision,
      jsonb_build_object('reason', reason));
end
$$;

create function public.assign_membership_leader(p_kind text, p_entity_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare inserted_count integer;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  perform 1 from public.member_profiles where id = p_user_id and status = 'ACTIVE' for share;
  if not found then raise exception 'member_status_blocked'; end if;
  if p_kind = 'CLASS' then
    insert into public.class_leaders (class_id, user_id, assigned_by)
      values (p_entity_id, p_user_id, auth.uid()) on conflict do nothing;
  elsif p_kind = 'CLUB' then
    insert into public.club_leaders (club_id, user_id, assigned_by)
      values (p_entity_id, p_user_id, auth.uid()) on conflict do nothing;
  else raise exception 'invalid_leader_type'; end if;
  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
    insert into public.membership_audit_log (user_id, actor_id, action, details)
      values (p_user_id, auth.uid(), 'LEADER_ASSIGNED', jsonb_build_object('kind', p_kind, 'entity_id', p_entity_id));
  end if;
end
$$;

-- Username/email mapping is never available to browser or member JWTs.
create function public.resolve_member_login_email(p_username text) returns text
language sql stable security definer set search_path = '' as $$
  select u.email from auth.users u join public.member_profiles p on p.id = u.id
  where p.username = lower(btrim(p_username))
$$;

create function public.consume_member_auth_attempt(p_key text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare count_value integer;
begin
  delete from public.membership_auth_limits where bucket_start < now() - interval '1 day';
  insert into public.membership_auth_limits as limits (attempt_key, bucket_start, attempts)
    values (p_key, date_bin(interval '15 minutes', now(), timestamptz '2000-01-01 00:00:00+00'), 1)
  on conflict (attempt_key) do update set bucket_start = excluded.bucket_start,
    attempts = case when limits.bucket_start = excluded.bucket_start then least(limits.attempts + 1, 11) else 1 end
  returning attempts into count_value;
  return count_value <= 10;
end
$$;

revoke all on function public.is_active_member(), public.can_review_signup(uuid, uuid),
  public.can_read_member(uuid), public.create_membership_application(uuid, jsonb),
  public.submit_membership_application(jsonb), public.handle_donuts_signup(),
  public.review_signup_request(uuid, text, text), public.assign_membership_leader(text, uuid, uuid),
  public.resolve_member_login_email(text), public.consume_member_auth_attempt(text)
  from public, anon, authenticated;
grant execute on function public.is_active_member() to anon, authenticated;
grant execute on function public.can_review_signup(uuid, uuid), public.can_read_member(uuid),
  public.submit_membership_application(jsonb), public.review_signup_request(uuid, text, text),
  public.assign_membership_leader(text, uuid, uuid) to authenticated;
grant execute on function public.resolve_member_login_email(text), public.consume_member_auth_attempt(text) to service_role;

commit;
