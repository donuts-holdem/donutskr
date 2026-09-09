-- Apply after 0025, with a coordinated application rollout. No site tables change.
-- Existing catalogs get no invented leaders, attendance, dates or XP.
begin;

alter table public.classes
  add column description text not null default '',
  add column first_started_at timestamptz,
  add column closed_at timestamptz,
  add column first_closed_at timestamptz,
  add column archived_at timestamptz,
  add column revision integer not null default 1 check (revision > 0),
  add constraint classes_open_enrollment check (not active or (closed_at is null and archived_at is null));
alter table public.clubs
  add column default_atc integer check (default_atc >= 0),
  add column archived_at timestamptz,
  add column revision integer not null default 1 check (revision > 0);

-- Leaders are real Auth identities, not necessarily membership profiles.
alter table public.class_leaders drop constraint class_leaders_user_id_fkey;
alter table public.class_leaders add constraint class_leaders_user_id_fkey foreign key (user_id) references auth.users(id);
alter table public.club_leaders drop constraint club_leaders_user_id_fkey;
alter table public.club_leaders add constraint club_leaders_user_id_fkey foreign key (user_id) references auth.users(id);
revoke insert, update, delete on public.classes, public.clubs from anon, authenticated;

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  session_number integer not null check (session_number > 0),
  scheduled_at timestamptz not null check (isfinite(scheduled_at)),
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED')),
  first_started_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  roster_run integer not null default 0 check (roster_run >= 0),
  attendance_saved_at timestamptz,
  attendance_locked boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  unique (class_id, session_number),
  check ((status = 'COMPLETED') = (completed_at is not null)),
  check (not attendance_locked or status in ('IN_PROGRESS', 'COMPLETED')),
  check (status = 'SCHEDULED' or (first_started_at is not null and roster_run > 0)),
  check ((cancelled_at is null) = (cancellation_reason is null))
);
create index class_sessions_dates_idx on public.class_sessions(class_id, scheduled_at);

-- Reverting a start retains the old run. Restarting creates a fresh snapshot.
create table public.class_attendance (
  session_id uuid not null references public.class_sessions(id),
  roster_run integer not null check (roster_run > 0),
  user_id uuid not null references public.member_profiles(id),
  snapshot_name text not null,
  snapshot_username text not null,
  mark text not null default 'UNCONFIRMED' check (mark in ('UNCONFIRMED', 'PRESENT', 'ABSENT')),
  checked_by uuid references auth.users(id),
  checked_at timestamptz,
  added_at timestamptz not null default now(),
  primary key (session_id, roster_run, user_id)
);
create index class_attendance_member_idx on public.class_attendance(user_id, session_id);

-- Entity IDs deliberately have no cascading FK: unused deletion retains its audit.
create table public.entity_operation_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('CLASS', 'CLUB')),
  entity_id uuid not null,
  session_id uuid,
  actor_id uuid not null references auth.users(id),
  action text not null,
  reason text,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index entity_operation_history_idx on public.entity_operation_log(kind, entity_id, created_at desc);
create index session_operation_history_idx on public.entity_operation_log(session_id, created_at desc);

create table public.class_closures (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  closed_at timestamptz not null default now(),
  actor_id uuid not null references auth.users(id)
);
create table public.class_closure_members (
  closure_id uuid not null references public.class_closures(id),
  user_id uuid not null references public.member_profiles(id),
  primary key (closure_id, user_id)
);

create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_profiles(id),
  source_kind text not null default 'CLASS_ATTENDANCE' check (source_kind = 'CLASS_ATTENDANCE'),
  session_id uuid not null references public.class_sessions(id),
  operation_id uuid not null references public.entity_operation_log(id),
  delta integer not null check (delta in (-100, 100)),
  actor_id uuid not null references auth.users(id),
  reason text not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (operation_id, user_id, session_id)
);
create index xp_ledger_member_idx on public.xp_ledger(user_id, created_at desc);
create index xp_ledger_session_idx on public.xp_ledger(session_id, user_id);

create function public.eligible_entity_leader(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u where u.id = p_user_id and (
    exists (select 1 from public.admin_emails a where lower(a.email) = lower(u.email))
    or (u.email_confirmed_at is not null and exists (
      select 1 from public.member_profiles p where p.id = u.id and p.status = 'ACTIVE'))
  ))
$$;

create function public.record_entity_operation(p_kind text, p_entity_id uuid, p_action text,
  p_reason text, p_before jsonb, p_after jsonb, p_session_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  insert into public.entity_operation_log(kind, entity_id, session_id, actor_id, action, reason, before_state, after_state)
  values (p_kind, p_entity_id, p_session_id, auth.uid(), p_action, p_reason,
    coalesce(p_before, '{}'::jsonb), coalesce(p_after, '{}'::jsonb)) returning id into result;
  return result;
end $$;

create function public.can_read_class_session(p_class_id uuid, p_session_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_review_affiliation('CLASS', p_class_id) or (public.is_active_member() and (
    exists (select 1 from public.class_memberships m where m.class_id = p_class_id and m.user_id = auth.uid() and m.active)
    or exists (select 1 from public.class_attendance a where a.session_id = p_session_id and a.user_id = auth.uid())
  ))
$$;
create function public.can_manage_class_session(p_session_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_sessions s where s.id = p_session_id
    and public.can_review_affiliation('CLASS', s.class_id))
$$;

do $$ declare t text; begin
  foreach t in array array['class_sessions', 'class_attendance', 'entity_operation_log',
    'class_closures', 'class_closure_members', 'xp_ledger'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
create policy class_sessions_read on public.class_sessions for select to authenticated
  using (public.can_read_class_session(class_id, id));
create policy class_attendance_read on public.class_attendance for select to authenticated
  using (public.can_manage_class_session(session_id) or (public.is_active_member() and user_id = auth.uid()));
create policy entity_operation_read on public.entity_operation_log for select to authenticated
  using (public.can_review_affiliation(kind, entity_id));
create policy class_closures_read on public.class_closures for select to authenticated
  using (public.can_review_affiliation('CLASS', class_id));
create policy class_closure_members_read on public.class_closure_members for select to authenticated
  using (exists (select 1 from public.class_closures c where c.id = closure_id
    and public.can_review_affiliation('CLASS', c.class_id)));
create policy xp_ledger_read on public.xp_ledger for select to authenticated
  using (public.is_admin() or (public.is_active_member() and user_id = auth.uid()));
drop policy class_leaders_read on public.class_leaders;
create policy class_leaders_read on public.class_leaders for select to authenticated
  using (user_id = auth.uid() or public.can_review_affiliation('CLASS', class_id));
drop policy club_leaders_read on public.club_leaders;
create policy club_leaders_read on public.club_leaders for select to authenticated
  using (user_id = auth.uid() or public.can_review_affiliation('CLUB', club_id));
drop policy clubs_read on public.clubs;
create policy clubs_read on public.clubs for select to anon, authenticated
  using (archived_at is null or public.is_admin() or public.is_active_member());

create function public.get_entity_leader_candidates() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', u.id,
    'label', coalesce(p.name || ' (' || p.username || ')', u.email, 'Administrator'),
    'is_admin', exists (select 1 from public.admin_emails a where lower(a.email) = lower(u.email)))
    order by coalesce(p.name, u.email)), '[]'::jsonb) into result
  from auth.users u left join public.member_profiles p on p.id = u.id where public.eligible_entity_leader(u.id);
  return result;
end $$;

create function public.get_entity_people(p_kind text, p_entity_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare leaders jsonb; members jsonb;
begin
  if auth.uid() is null or not public.can_review_affiliation(p_kind, p_entity_id) then raise exception 'forbidden'; end if;
  if p_kind is null or p_kind not in ('CLASS', 'CLUB') then raise exception 'invalid_affiliation_kind'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', l.user_id,
    'label', coalesce(p.name || ' (' || p.username || ')', 'Administrator'),
    'eligible', public.eligible_entity_leader(l.user_id)) order by l.assigned_at), '[]'::jsonb) into leaders
  from (
    select user_id, assigned_at from public.class_leaders where p_kind = 'CLASS' and class_id = p_entity_id
    union all select user_id, assigned_at from public.club_leaders where p_kind = 'CLUB' and club_id = p_entity_id
  ) l left join public.member_profiles p on p.id = l.user_id;
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'username', p.username,
    'status', p.status, 'active', m.active, 'joined_at', m.joined_at) order by p.name), '[]'::jsonb) into members
  from (
    select user_id, active, joined_at from public.class_memberships where p_kind = 'CLASS' and class_id = p_entity_id
    union all select user_id, active, joined_at from public.club_memberships where p_kind = 'CLUB' and club_id = p_entity_id
  ) m join public.member_profiles p on p.id = m.user_id;
  return jsonb_build_object('leaders', leaders, 'members', members);
end $$;

create or replace function public.assign_membership_leader(p_kind text, p_entity_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare inserted_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if not public.eligible_entity_leader(p_user_id) then raise exception 'member_status_blocked'; end if;
  if p_kind = 'CLASS' then
    perform 1 from public.classes where id = p_entity_id and archived_at is null for update;
    if not found then raise exception 'entity_archived'; end if;
    insert into public.class_leaders(class_id, user_id, assigned_by) values(p_entity_id, p_user_id, auth.uid()) on conflict do nothing;
  elsif p_kind = 'CLUB' then
    perform 1 from public.clubs where id = p_entity_id and archived_at is null for update;
    if not found then raise exception 'entity_archived'; end if;
    insert into public.club_leaders(club_id, user_id, assigned_by) values(p_entity_id, p_user_id, auth.uid()) on conflict do nothing;
  else raise exception 'invalid_leader_type'; end if;
  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
    perform public.record_entity_operation(p_kind, p_entity_id, 'LEADER_ASSIGNED', null, null, jsonb_build_object('user_id', p_user_id));
  end if;
end $$;

create or replace function public.remove_membership_leader(p_kind text, p_entity_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if p_kind = 'CLASS' then
    perform 1 from public.classes where id = p_entity_id and archived_at is null for update;
    if not found then raise exception 'entity_archived'; end if;
    if not exists (select 1 from public.class_leaders where class_id = p_entity_id and user_id = p_user_id) then return; end if;
    if not exists (select 1 from public.class_leaders where class_id = p_entity_id and user_id <> p_user_id
      and public.eligible_entity_leader(user_id)) then raise exception 'last_leader_requires_replacement'; end if;
    delete from public.class_leaders where class_id = p_entity_id and user_id = p_user_id;
  elsif p_kind = 'CLUB' then
    perform 1 from public.clubs where id = p_entity_id and archived_at is null for update;
    if not found then raise exception 'entity_archived'; end if;
    if not exists (select 1 from public.club_leaders where club_id = p_entity_id and user_id = p_user_id) then return; end if;
    if not exists (select 1 from public.club_leaders where club_id = p_entity_id and user_id <> p_user_id
      and public.eligible_entity_leader(user_id)) then raise exception 'last_leader_requires_replacement'; end if;
    delete from public.club_leaders where club_id = p_entity_id and user_id = p_user_id;
  else raise exception 'invalid_leader_type'; end if;
  perform public.record_entity_operation(p_kind, p_entity_id, 'LEADER_REMOVED', null, jsonb_build_object('user_id', p_user_id), null);
end $$;

create function public.save_operating_entity(p_kind text, p_entity_id uuid, p_expected_revision integer, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  result uuid := coalesce(p_entity_id, gen_random_uuid()); previous jsonb; current_value jsonb;
  course public.classes%rowtype; club public.clubs%rowtype; leader uuid; stamp timestamptz;
  reason text := nullif(btrim(p_payload ->> 'reason'), '');
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if p_kind is null or p_kind not in ('CLASS', 'CLUB') or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_entity'; end if;
  if char_length(coalesce(p_payload ->> 'description', '')) > 4000 then raise exception 'invalid_entity'; end if;
  if p_entity_id is not null and (reason is null or char_length(reason) > 500) then raise exception 'invalid_reason'; end if;
  if p_entity_id is null and (jsonb_typeof(p_payload -> 'leader_ids') is distinct from 'array'
    or jsonb_array_length(p_payload -> 'leader_ids') < 1) then raise exception 'leader_required'; end if;
  if p_kind = 'CLASS' then
    if p_entity_id is null then
      if jsonb_typeof(p_payload -> 'session_times') is distinct from 'array'
        or jsonb_array_length(p_payload -> 'session_times') < 1 then raise exception 'session_dates_required'; end if;
      for stamp in select value::timestamptz from jsonb_array_elements_text(p_payload -> 'session_times') loop
        if stamp is null or not isfinite(stamp) then raise exception 'invalid_schedule'; end if;
      end loop;
      insert into public.classes(id, name, description, place, weekday, start_time, active)
      values(result, btrim(p_payload ->> 'name'), coalesce(p_payload ->> 'description', ''),
        btrim(p_payload ->> 'place'), (p_payload ->> 'weekday')::smallint, (p_payload ->> 'start_time')::time,
        coalesce((p_payload ->> 'active')::boolean, true));
      insert into public.class_sessions(class_id, session_number, scheduled_at)
        select result, ordinality::integer, value::timestamptz
        from jsonb_array_elements_text(p_payload -> 'session_times') with ordinality;
    else
      select * into course from public.classes where id = result for update;
      if not found then raise exception 'invalid_entity'; end if;
      if course.archived_at is not null then raise exception 'entity_archived'; end if;
      if course.revision is distinct from p_expected_revision then raise exception 'stale_operation'; end if;
      if coalesce((p_payload ->> 'active')::boolean, false) then
        if course.closed_at is not null then raise exception 'entity_closed'; end if;
        if not exists (select 1 from public.class_leaders where class_id = result and public.eligible_entity_leader(user_id)) then raise exception 'leader_required'; end if;
        if not exists (select 1 from public.class_sessions where class_id = result) then raise exception 'session_dates_required'; end if;
      end if;
      previous := to_jsonb(course);
      update public.classes set name = btrim(p_payload ->> 'name'), description = coalesce(p_payload ->> 'description', ''),
        place = btrim(p_payload ->> 'place'), weekday = (p_payload ->> 'weekday')::smallint,
        start_time = (p_payload ->> 'start_time')::time, active = coalesce((p_payload ->> 'active')::boolean, false), revision = revision + 1 where id = result;
    end if;
    select to_jsonb(c) into current_value from public.classes c where id = result;
  else
    if nullif(p_payload ->> 'logo_url', '') is not null and
      (p_payload ->> 'logo_url' !~ '^https://[^[:space:]]+$' or char_length(p_payload ->> 'logo_url') > 2048) then raise exception 'invalid_entity'; end if;
    if p_entity_id is not null then
      select * into club from public.clubs where id = result for update;
      if not found then raise exception 'invalid_entity'; end if;
      if club.archived_at is not null then raise exception 'entity_archived'; end if;
      if club.revision is distinct from p_expected_revision then raise exception 'stale_operation'; end if;
      previous := to_jsonb(club);
    end if;
    if p_entity_id is null or club.school_id is distinct from (p_payload ->> 'school_id')::uuid then
      perform 1 from public.schools where id = (p_payload ->> 'school_id')::uuid and active;
      if not found then raise exception 'invalid_school'; end if;
    end if;
    if p_entity_id is null then
      insert into public.clubs(id, name, school_id, description, logo_url, default_atc)
      values(result, btrim(p_payload ->> 'name'), (p_payload ->> 'school_id')::uuid,
        coalesce(p_payload ->> 'description', ''), nullif(p_payload ->> 'logo_url', ''), nullif(p_payload ->> 'default_atc', '')::integer);
    else
      update public.clubs set name = btrim(p_payload ->> 'name'), school_id = (p_payload ->> 'school_id')::uuid,
        description = coalesce(p_payload ->> 'description', ''), logo_url = nullif(p_payload ->> 'logo_url', ''),
        default_atc = nullif(p_payload ->> 'default_atc', '')::integer, revision = revision + 1 where id = result;
    end if;
    select to_jsonb(c) into current_value from public.clubs c where id = result;
  end if;
  if p_entity_id is null then
    for leader in select distinct value::uuid from jsonb_array_elements_text(p_payload -> 'leader_ids') loop
      perform public.assign_membership_leader(p_kind, result, leader);
    end loop;
  end if;
  perform public.record_entity_operation(p_kind, result, case when p_entity_id is null then 'ENTITY_CREATED' else 'ENTITY_UPDATED' end,
    reason, previous, current_value);
  return result;
end $$;

-- Legacy signup/application RPCs also pass through this lifecycle guard.
create function public.guard_affiliation_entity_lifecycle() returns trigger
language plpgsql security definer set search_path = '' as $$
declare course public.classes%rowtype; archived timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if new.kind = 'CLASS' then
    select * into course from public.classes where id = new.class_id for share;
    if not found then raise exception 'invalid_class'; end if;
    if course.archived_at is not null then raise exception 'entity_archived'; end if;
    if (tg_op = 'INSERT' or new.status = 'APPROVED') and (not course.active or course.closed_at is not null) then raise exception 'invalid_class'; end if;
  else
    select archived_at into archived from public.clubs where id = new.club_id for share;
    if not found then raise exception 'invalid_club'; end if;
    if archived is not null then raise exception 'entity_archived'; end if;
  end if;
  return new;
end $$;
create trigger affiliation_entity_lifecycle before insert or update on public.affiliation_requests
  for each row execute function public.guard_affiliation_entity_lifecycle();

create function public.remove_entity_member(p_kind text, p_entity_id uuid, p_user_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare reason text := nullif(btrim(p_reason), ''); changed integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if reason is null or char_length(reason) > 500 then raise exception 'invalid_reason'; end if;
  if p_kind = 'CLASS' then
    perform 1 from public.classes where id = p_entity_id and archived_at is null for update;
    if not found then raise exception 'entity_archived'; end if;
    update public.class_memberships set active = false where class_id = p_entity_id and user_id = p_user_id and active;
  elsif p_kind = 'CLUB' then
    perform 1 from public.clubs where id = p_entity_id and archived_at is null for update;
    if not found then raise exception 'entity_archived'; end if;
    update public.club_memberships set active = false where club_id = p_entity_id and user_id = p_user_id and active;
  else raise exception 'invalid_affiliation_kind'; end if;
  get diagnostics changed = row_count;
  if changed > 0 then
    perform public.record_entity_operation(p_kind, p_entity_id, 'AFFILIATION_REMOVED', reason,
      jsonb_build_object('user_id', p_user_id, 'active', true), jsonb_build_object('user_id', p_user_id, 'active', false));
  end if;
end $$;

create function public.retire_operating_entity(p_kind text, p_entity_id uuid, p_expected_revision integer, p_delete_unused boolean, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare previous jsonb; course public.classes%rowtype; club public.clubs%rowtype; reason text := nullif(btrim(p_reason), '');
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if reason is null or char_length(reason) > 500 or p_delete_unused is null then raise exception 'invalid_reason'; end if;
  if p_kind = 'CLASS' then
    select * into course from public.classes where id = p_entity_id for update;
    if not found then raise exception 'invalid_entity'; end if;
    if course.archived_at is not null then raise exception 'entity_archived'; end if;
    if course.revision is distinct from p_expected_revision then raise exception 'stale_operation'; end if;
    previous := to_jsonb(course);
  elsif p_kind = 'CLUB' then
    select * into club from public.clubs where id = p_entity_id for update;
    if not found then raise exception 'invalid_entity'; end if;
    if club.archived_at is not null then raise exception 'entity_archived'; end if;
    if club.revision is distinct from p_expected_revision then raise exception 'stale_operation'; end if;
    previous := to_jsonb(club);
  else raise exception 'invalid_affiliation_kind'; end if;
  if exists (select 1 from public.affiliation_requests where kind = p_kind
    and coalesce(class_id, club_id) = p_entity_id and (p_delete_unused or status = 'PENDING')) then
    if p_delete_unused then raise exception 'entity_has_history'; else raise exception 'pending_applications'; end if;
  end if;
  if p_delete_unused then
    if exists (select 1 from public.signup_requests where
      (p_kind = 'CLASS' and requested_class_id = p_entity_id) or (p_kind = 'CLUB' and requested_club_id = p_entity_id))
      or exists (select 1 from public.class_memberships where p_kind = 'CLASS' and class_id = p_entity_id)
      or exists (select 1 from public.club_memberships where p_kind = 'CLUB' and club_id = p_entity_id)
      or exists (select 1 from public.class_sessions where p_kind = 'CLASS' and class_id = p_entity_id
        and (first_started_at is not null or cancelled_at is not null))
      or (p_kind = 'CLASS' and course.first_closed_at is not null) then raise exception 'entity_has_history'; end if;
    if p_kind = 'CLASS' then
      delete from public.class_leaders where class_id = p_entity_id;
      delete from public.class_sessions where class_id = p_entity_id;
      delete from public.classes where id = p_entity_id;
    else
      delete from public.club_leaders where club_id = p_entity_id;
      delete from public.clubs where id = p_entity_id;
    end if;
  else
    if p_kind = 'CLASS' then
      if exists (select 1 from public.class_sessions where class_id = p_entity_id and cancelled_at is null
        and (status <> 'COMPLETED' or not attendance_locked)) then raise exception 'unfinished_sessions'; end if;
      update public.classes set archived_at = now(), active = false, revision = revision + 1 where id = p_entity_id;
    else
      -- The future meeting domain must extend this guard before enabling meetings.
      update public.clubs set archived_at = now(), revision = revision + 1 where id = p_entity_id;
    end if;
  end if;
  perform public.record_entity_operation(p_kind, p_entity_id, case when p_delete_unused then 'ENTITY_DELETED' else 'ENTITY_ARCHIVED' end,
    reason, previous, jsonb_build_object('deleted', p_delete_unused, 'archived', not p_delete_unused));
end $$;

create function public.add_class_session(p_class_id uuid, p_expected_revision integer, p_scheduled_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare course public.classes%rowtype; result uuid; number_value integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  select * into course from public.classes where id = p_class_id for update;
  if not found then raise exception 'invalid_entity'; end if;
  if course.archived_at is not null then raise exception 'entity_archived'; end if;
  if course.first_closed_at is not null then raise exception 'class_cannot_extend'; end if;
  if course.revision is distinct from p_expected_revision then raise exception 'stale_operation'; end if;
  if p_scheduled_at is null or not isfinite(p_scheduled_at) then raise exception 'invalid_schedule'; end if;
  select coalesce(max(session_number), 0) + 1 into number_value from public.class_sessions where class_id = p_class_id;
  insert into public.class_sessions(class_id, session_number, scheduled_at) values(p_class_id, number_value, p_scheduled_at) returning id into result;
  update public.classes set revision = revision + 1 where id = p_class_id;
  perform public.record_entity_operation('CLASS', p_class_id, 'SESSION_ADDED', null, null,
    jsonb_build_object('session_number', number_value, 'scheduled_at', p_scheduled_at), result);
  return result;
end $$;

create function public.reschedule_class_sessions(p_session_id uuid, p_scheduled_at timestamptz,
  p_move_future boolean, p_expected jsonb, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.class_sessions%rowtype; course public.classes%rowtype; expected jsonb; previous jsonb; changed jsonb;
  delta interval; reason text := nullif(btrim(p_reason), '');
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  select * into s from public.class_sessions where id = p_session_id for update;
  if not found then raise exception 'invalid_entity'; end if;
  if auth.uid() is null or not public.can_review_affiliation('CLASS', s.class_id) then raise exception 'forbidden'; end if;
  select * into course from public.classes where id = s.class_id for update;
  if course.archived_at is not null then raise exception 'entity_archived'; end if;
  if s.cancelled_at is not null or (s.status <> 'SCHEDULED' and not public.is_admin()) then raise exception 'forbidden'; end if;
  if p_move_future is null or (p_move_future and s.status <> 'SCHEDULED') then raise exception 'invalid_schedule'; end if;
  if reason is null or char_length(reason) > 500 then raise exception 'invalid_reason'; end if;
  if p_scheduled_at is null or not isfinite(p_scheduled_at) then raise exception 'invalid_schedule'; end if;
  select jsonb_object_agg(id::text, revision), jsonb_agg(jsonb_build_object('id', id, 'scheduled_at', scheduled_at) order by session_number)
    into expected, previous from public.class_sessions where id = s.id or
      (p_move_future and class_id = s.class_id and session_number >= s.session_number and status = 'SCHEDULED' and cancelled_at is null);
  if expected is distinct from p_expected then raise exception 'stale_operation'; end if;
  delta := p_scheduled_at - s.scheduled_at;
  update public.class_sessions set scheduled_at = scheduled_at + delta, revision = revision + 1
    where id = s.id or (p_move_future and class_id = s.class_id and session_number >= s.session_number and status = 'SCHEDULED' and cancelled_at is null);
  select jsonb_agg(jsonb_build_object('id', id, 'scheduled_at', scheduled_at) order by session_number)
    into changed from public.class_sessions where expected ? id::text;
  perform public.record_entity_operation('CLASS', s.class_id, 'SESSION_RESCHEDULED', reason, previous, changed, s.id);
end $$;

create function public.reconcile_class_attendance_xp(p_session_id uuid, p_operation_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.class_sessions%rowtype;
begin
  select * into s from public.class_sessions where id = p_session_id;
  with credited as (
    select user_id, sum(delta)::integer as amount from public.xp_ledger where session_id = s.id group by user_id
  ), desired as (
    select user_id, case when s.status = 'COMPLETED' and s.attendance_locked and s.cancelled_at is null
      and mark = 'PRESENT' then 100 else 0 end as amount
    from public.class_attendance where session_id = s.id and roster_run = s.roster_run
  ), adjustments as (
    select coalesce(d.user_id, c.user_id) as user_id, coalesce(d.amount, 0) - coalesce(c.amount, 0) as delta
    from desired d full outer join credited c using (user_id)
  )
  insert into public.xp_ledger(user_id, session_id, operation_id, delta, actor_id, reason)
    select user_id, s.id, p_operation_id, delta, auth.uid(), p_reason from adjustments where delta <> 0;
end $$;

create function public.close_resolved_class(p_class_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare course public.classes%rowtype; closure uuid;
begin
  select * into course from public.classes where id = p_class_id for update;
  if course.closed_at is not null or course.archived_at is not null then return; end if;
  if not exists (select 1 from public.class_sessions where class_id = p_class_id)
    or exists (select 1 from public.class_sessions where class_id = p_class_id and cancelled_at is null and status <> 'COMPLETED') then return; end if;
  update public.classes set closed_at = now(), first_closed_at = coalesce(first_closed_at, now()), active = false,
    revision = revision + 1 where id = p_class_id;
  insert into public.class_closures(class_id, actor_id) values(p_class_id, auth.uid()) returning id into closure;
  insert into public.class_closure_members(closure_id, user_id)
    select closure, user_id from public.class_memberships where class_id = p_class_id and active;
  perform public.record_entity_operation('CLASS', p_class_id, 'CLASS_CLOSED', 'All sessions completed or cancelled',
    to_jsonb(course), jsonb_build_object('closure_id', closure, 'closed_at', now()));
end $$;

create function public.change_class_session(p_session_id uuid, p_expected_revision integer, p_action text,
  p_reason text default null, p_marks jsonb default null, p_user_id uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.class_sessions%rowtype; course public.classes%rowtype; after_session public.class_sessions%rowtype;
  reason text := nullif(btrim(p_reason), ''); previous_marks jsonb; after_marks jsonb; expected_keys jsonb; submitted_keys jsonb; operation uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  select * into s from public.class_sessions where id = p_session_id for update;
  if not found then raise exception 'invalid_entity'; end if;
  if auth.uid() is null or not public.can_review_affiliation('CLASS', s.class_id) then raise exception 'forbidden'; end if;
  select * into course from public.classes where id = s.class_id for update;
  if course.archived_at is not null then raise exception 'entity_archived'; end if;
  if s.revision is distinct from p_expected_revision then raise exception 'stale_operation'; end if;
  if p_action is null or p_action not in ('START', 'REVERT_START', 'SAVE_ATTENDANCE', 'MISSING_AS_ABSENT', 'ADD_ATTENDEE', 'LOCK', 'UNLOCK', 'COMPLETE', 'CANCEL', 'RESTORE_CANCEL', 'DELETE') then raise exception 'invalid_session_transition'; end if;
  if s.cancelled_at is not null and p_action <> 'RESTORE_CANCEL' then raise exception 'invalid_session_transition'; end if;
  if (p_action in ('REVERT_START', 'UNLOCK', 'CANCEL', 'RESTORE_CANCEL', 'DELETE', 'ADD_ATTENDEE') or s.status = 'COMPLETED')
    and (reason is null or char_length(reason) > 500) then raise exception 'invalid_reason'; end if;
  if char_length(reason) > 500 then raise exception 'invalid_reason'; end if;
  select coalesce(jsonb_object_agg(user_id::text, mark), '{}'::jsonb) into previous_marks
    from public.class_attendance where session_id = s.id and roster_run = s.roster_run;

  if p_action = 'START' then
    if s.status <> 'SCHEDULED' or course.closed_at is not null then raise exception 'invalid_session_transition'; end if;
    if not exists (select 1 from public.class_leaders where class_id = s.class_id and public.eligible_entity_leader(user_id)) then raise exception 'leader_required'; end if;
    update public.class_sessions set status = 'IN_PROGRESS', started_at = now(), first_started_at = coalesce(first_started_at, now()),
      roster_run = roster_run + 1, attendance_saved_at = null where id = s.id;
    insert into public.class_attendance(session_id, roster_run, user_id, snapshot_name, snapshot_username)
      select s.id, s.roster_run + 1, p.id, p.name, p.username from public.class_memberships m
      join public.member_profiles p on p.id = m.user_id where m.class_id = s.class_id and m.active;
    if course.first_started_at is null then
      update public.classes set first_started_at = now(), revision = revision + 1 where id = s.class_id;
    end if;
  elsif p_action = 'REVERT_START' then
    if s.status <> 'IN_PROGRESS' or s.attendance_locked or s.attendance_saved_at is not null then raise exception 'start_revert_blocked'; end if;
    update public.class_sessions set status = 'SCHEDULED', started_at = null where id = s.id;
  elsif p_action in ('SAVE_ATTENDANCE', 'MISSING_AS_ABSENT', 'ADD_ATTENDEE') then
    if s.status not in ('IN_PROGRESS', 'COMPLETED') then raise exception 'invalid_session_transition'; end if;
    if s.attendance_locked then raise exception 'attendance_locked'; end if;
    if p_action = 'ADD_ATTENDEE' then
      if not exists (select 1 from public.class_memberships where class_id = s.class_id and user_id = p_user_id and active) then raise exception 'not_affiliated'; end if;
      insert into public.class_attendance(session_id, roster_run, user_id, snapshot_name, snapshot_username)
        select s.id, s.roster_run, id, name, username from public.member_profiles where id = p_user_id on conflict do nothing;
    elsif p_action = 'MISSING_AS_ABSENT' then
      update public.class_attendance set mark = 'ABSENT', checked_by = auth.uid(), checked_at = now()
        where session_id = s.id and roster_run = s.roster_run and mark = 'UNCONFIRMED';
    else
      if jsonb_typeof(p_marks) is distinct from 'object' then raise exception 'invalid_attendance'; end if;
      select coalesce(jsonb_object_agg(user_id::text, true), '{}'::jsonb) into expected_keys
        from public.class_attendance where session_id = s.id and roster_run = s.roster_run;
      select coalesce(jsonb_object_agg(key, true), '{}'::jsonb) into submitted_keys from jsonb_each(p_marks);
      if expected_keys is distinct from submitted_keys or exists (select 1 from jsonb_each_text(p_marks)
        where value is null or value not in ('UNCONFIRMED', 'PRESENT', 'ABSENT')) then raise exception 'invalid_attendance'; end if;
      update public.class_attendance set mark = p_marks ->> user_id::text, checked_by = auth.uid(), checked_at = now()
        where session_id = s.id and roster_run = s.roster_run and mark is distinct from p_marks ->> user_id::text;
    end if;
    update public.class_sessions set attendance_saved_at = now() where id = s.id;
  elsif p_action = 'LOCK' then
    if s.status not in ('IN_PROGRESS', 'COMPLETED') or s.attendance_locked then raise exception 'invalid_session_transition'; end if;
    if exists (select 1 from public.class_attendance where session_id = s.id and roster_run = s.roster_run and mark = 'UNCONFIRMED') then raise exception 'attendance_unconfirmed'; end if;
    update public.class_sessions set attendance_locked = true where id = s.id;
  elsif p_action = 'UNLOCK' then
    if not s.attendance_locked then raise exception 'invalid_session_transition'; end if;
    update public.class_sessions set attendance_locked = false where id = s.id;
  elsif p_action = 'COMPLETE' then
    if s.status <> 'IN_PROGRESS' or not s.attendance_locked then raise exception 'invalid_session_transition'; end if;
    update public.class_sessions set status = 'COMPLETED', completed_at = now() where id = s.id;
  elsif p_action = 'CANCEL' then
    update public.class_sessions set cancelled_at = now(), cancellation_reason = reason where id = s.id;
  elsif p_action = 'RESTORE_CANCEL' then
    if s.cancelled_at is null then raise exception 'invalid_session_transition'; end if;
    if course.closed_at is not null and s.status <> 'COMPLETED' then
      if not public.is_admin() then raise exception 'recovery_admin_only'; end if;
      update public.classes set closed_at = null, active = false, revision = revision + 1 where id = s.class_id;
      perform public.record_entity_operation('CLASS', s.class_id, 'CLASS_REOPENED_FOR_CORRECTION', reason,
        to_jsonb(course), jsonb_build_object('restored_session_id', s.id, 'enrollment_open', false), s.id);
    end if;
    update public.class_sessions set cancelled_at = null, cancellation_reason = null where id = s.id;
  elsif p_action = 'DELETE' then
    if not public.is_admin() then raise exception 'forbidden'; end if;
    if course.first_started_at is not null or course.first_closed_at is not null or s.first_started_at is not null or s.status <> 'SCHEDULED' then raise exception 'class_already_started'; end if;
    if (select count(*) from public.class_sessions where class_id = s.class_id) <= 1 then raise exception 'final_session_required'; end if;
    delete from public.class_sessions where id = s.id;
    update public.classes set revision = revision + 1 where id = s.class_id;
    perform public.record_entity_operation('CLASS', s.class_id, 'SESSION_DELETED', reason, to_jsonb(s), null, s.id);
    return;
  end if;
  update public.class_sessions set revision = revision + 1 where id = s.id returning * into after_session;
  select coalesce(jsonb_object_agg(user_id::text, mark), '{}'::jsonb) into after_marks
    from public.class_attendance where session_id = s.id and roster_run = after_session.roster_run;
  operation := public.record_entity_operation('CLASS', s.class_id, p_action, reason,
    jsonb_build_object('session', to_jsonb(s), 'attendance', previous_marks),
    jsonb_build_object('session', to_jsonb(after_session), 'attendance', after_marks), s.id);
  if p_action in ('COMPLETE', 'LOCK', 'CANCEL', 'RESTORE_CANCEL') then
    perform public.reconcile_class_attendance_xp(s.id, operation, coalesce(reason, p_action));
  end if;
  perform public.close_resolved_class(s.class_id);
end $$;

create function public.get_my_class_activity() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare total bigint; level_value bigint; attendance jsonb; ledger jsonb;
begin
  if auth.uid() is null or not (public.is_active_member() or public.is_admin()) then raise exception 'forbidden'; end if;
  select coalesce(sum(delta), 0) into total from public.xp_ledger where user_id = auth.uid();
  level_value := floor((1 + sqrt(1 + total::numeric * 0.08)) / 2)::bigint;
  select coalesce(jsonb_agg(to_jsonb(rows) order by scheduled_at desc), '[]'::jsonb) into attendance from (
    select s.id as session_id, c.id as class_id, c.name as class_name, s.session_number, s.scheduled_at,
      s.status, s.cancelled_at, s.attendance_locked, a.mark
    from public.class_attendance a join public.class_sessions s on s.id = a.session_id and s.roster_run = a.roster_run
      join public.classes c on c.id = s.class_id
    where a.user_id = auth.uid() and s.status <> 'SCHEDULED' order by s.scheduled_at desc limit 50
  ) rows;
  select coalesce(jsonb_agg(to_jsonb(rows) order by created_at desc), '[]'::jsonb) into ledger from (
    select x.id, x.delta, x.reason, x.created_at, c.name as class_name, s.session_number
    from public.xp_ledger x join public.class_sessions s on s.id = x.session_id join public.classes c on c.id = s.class_id
    where x.user_id = auth.uid() order by x.created_at desc limit 50
  ) rows;
  return jsonb_build_object('total_xp', total, 'level', level_value,
    'level_start_xp', 50 * level_value * (level_value - 1), 'next_level_xp', 50 * level_value * (level_value + 1),
    'attendance', attendance, 'ledger', ledger);
end $$;

-- Only the listed RPCs are callable. Helpers cannot be used as write bypasses.
revoke all on function public.eligible_entity_leader(uuid),
  public.record_entity_operation(text, uuid, text, text, jsonb, jsonb, uuid),
  public.can_read_class_session(uuid, uuid), public.can_manage_class_session(uuid),
  public.get_entity_leader_candidates(), public.get_entity_people(text, uuid),
  public.save_operating_entity(text, uuid, integer, jsonb), public.guard_affiliation_entity_lifecycle(),
  public.remove_entity_member(text, uuid, uuid, text), public.retire_operating_entity(text, uuid, integer, boolean, text),
  public.add_class_session(uuid, integer, timestamptz), public.reschedule_class_sessions(uuid, timestamptz, boolean, jsonb, text),
  public.reconcile_class_attendance_xp(uuid, uuid, text), public.close_resolved_class(uuid),
  public.change_class_session(uuid, integer, text, text, jsonb, uuid), public.get_my_class_activity()
  from public, anon, authenticated;
grant execute on function public.can_read_class_session(uuid, uuid), public.can_manage_class_session(uuid),
  public.get_entity_leader_candidates(), public.get_entity_people(text, uuid),
  public.save_operating_entity(text, uuid, integer, jsonb), public.remove_entity_member(text, uuid, uuid, text),
  public.retire_operating_entity(text, uuid, integer, boolean, text), public.add_class_session(uuid, integer, timestamptz),
  public.reschedule_class_sessions(uuid, timestamptz, boolean, jsonb, text),
  public.change_class_session(uuid, integer, text, text, jsonb, uuid), public.get_my_class_activity()
  to authenticated;

commit;
