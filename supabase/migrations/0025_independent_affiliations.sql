-- Membership policy slice: email activation and independent affiliations.
-- Append-only migration. Apply separately after 0024; no public site data changes.
begin;

create table public.affiliation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_profiles(id),
  kind text not null check (kind in ('CLASS', 'CLUB')),
  class_id uuid references public.classes(id),
  club_id uuid references public.clubs(id),
  source_signup_request_id uuid references public.signup_requests(id),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_reason text check (char_length(decision_reason) <= 500),
  created_at timestamptz not null default now(),
  unique (source_signup_request_id, kind),
  check ((kind = 'CLASS' and class_id is not null and club_id is null)
    or (kind = 'CLUB' and club_id is not null and class_id is null)),
  check ((status = 'PENDING' and decided_by is null and decided_at is null)
    or (status <> 'PENDING' and decided_by is not null and decided_at is not null))
);
create unique index affiliation_requests_pending_class
  on public.affiliation_requests(user_id, class_id) where status = 'PENDING' and kind = 'CLASS';
create unique index affiliation_requests_pending_club
  on public.affiliation_requests(user_id, club_id) where status = 'PENDING' and kind = 'CLUB';
create index affiliation_requests_user_created_idx on public.affiliation_requests(user_id, created_at desc);
create index affiliation_requests_class_queue_idx on public.affiliation_requests(class_id, status, created_at);
create index affiliation_requests_club_queue_idx on public.affiliation_requests(club_id, status, created_at);
alter table public.membership_audit_log add column affiliation_request_id uuid references public.affiliation_requests(id);

-- Preserve the original consent/application snapshots and historical decisions.
-- Splitting a pending application never grants either affiliation.
insert into public.affiliation_requests (user_id, kind, class_id, source_signup_request_id,
  status, decided_by, decided_at, decision_reason, created_at)
select user_id, 'CLASS', requested_class_id, id, status, decided_by, decided_at, decision_reason, created_at
from public.signup_requests;
insert into public.affiliation_requests (user_id, kind, club_id, source_signup_request_id,
  status, decided_by, decided_at, decision_reason, created_at)
select user_id, 'CLUB', requested_club_id, id, status, decided_by, decided_at, decision_reason, created_at
from public.signup_requests where requested_club_id is not null;

create function public.can_review_affiliation(p_kind text, p_entity_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (public.is_active_member() and (
    (p_kind = 'CLASS' and exists (select 1 from public.class_leaders
      where user_id = auth.uid() and class_id = p_entity_id))
    or (p_kind = 'CLUB' and exists (select 1 from public.club_leaders
      where user_id = auth.uid() and club_id = p_entity_id))
  ))
$$;

create or replace function public.can_read_member(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() = p_user_id or public.is_admin() or (public.is_active_member() and (
    exists (select 1 from public.affiliation_requests r where r.user_id = p_user_id
      and r.status = 'PENDING' and public.can_review_affiliation(r.kind, coalesce(r.class_id, r.club_id)))
    or exists (select 1 from public.class_memberships m join public.class_leaders l using (class_id)
      where m.user_id = p_user_id and m.active and l.user_id = auth.uid())
    or exists (select 1 from public.club_memberships m join public.club_leaders l using (club_id)
      where m.user_id = p_user_id and m.active and l.user_id = auth.uid())
  ))
$$;

-- Retire the combined approval endpoint, including access through old clients.
create or replace function public.can_review_signup(p_class_id uuid, p_club_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select public.is_admin() $$;
create or replace function public.review_signup_request(p_request_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'separate_affiliation_approval_required';
end
$$;
revoke all on function public.review_signup_request(uuid, text, text) from public, anon, authenticated;
drop policy signup_requests_read on public.signup_requests;
create policy signup_requests_read on public.signup_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

alter table public.affiliation_requests enable row level security;
revoke all on public.affiliation_requests from anon, authenticated;
grant select on public.affiliation_requests to authenticated;
create policy affiliation_requests_read on public.affiliation_requests for select to authenticated
  using (user_id = auth.uid() or public.can_review_affiliation(kind, coalesce(class_id, club_id)));

create or replace function public.create_membership_application(p_user_id uuid, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  settings public.membership_settings%rowtype;
  school uuid := nullif(p_payload ->> 'school_id', '')::uuid;
  requested_class uuid := nullif(p_payload ->> 'class_id', '')::uuid;
  requested_club uuid := nullif(p_payload ->> 'club_id', '')::uuid;
  other_school text := nullif(btrim(p_payload ->> 'other_school_name'), '');
  request_id uuid;
  initial_status text;
begin
  if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'invalid_application';
  end if;
  -- Short membership mutations share a lock, including approvals, suspension and
  -- leader replacement. This prevents a revoked leader completing a queued write.
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if exists (select 1 from auth.users u join public.admin_emails a on lower(a.email) = lower(u.email)
    where u.id = p_user_id) then raise exception 'admin_account'; end if;
  if exists (select 1 from public.member_profiles where id = p_user_id) then
    raise exception 'profile_already_exists';
  end if;
  select * into settings from public.membership_settings where singleton for share;
  if settings.signup_open is distinct from true then raise exception 'membership_closed'; end if;
  if p_payload ->> 'consent' is distinct from 'true'
    or p_payload ->> 'consent_version' is distinct from settings.consent_version then
    raise exception 'terms_changed';
  end if;
  perform 1 from public.classes where id = requested_class and active for share;
  if not found then raise exception 'invalid_class'; end if;
  if school is not null then
    perform 1 from public.schools where id = school and active for share;
    if not found then raise exception 'invalid_school'; end if;
    other_school := null;
  elsif other_school is null then raise exception 'invalid_school'; end if;
  if requested_club is not null then
    -- Club school is descriptive, not an applicant eligibility restriction.
    perform 1 from public.clubs where id = requested_club for share;
    if not found then raise exception 'invalid_club'; end if;
  end if;
  select case when email_confirmed_at is not null then 'ACTIVE' else 'PENDING' end
    into initial_status from auth.users where id = p_user_id;
  if initial_status is null then raise exception 'unauthorized'; end if;
  insert into public.member_profiles (id, username, name, phone, school_id,
    other_school_name, status, consent_version)
  values (p_user_id, lower(btrim(p_payload ->> 'username')), btrim(p_payload ->> 'name'),
    p_payload ->> 'phone', school, other_school, initial_status, settings.consent_version);
  insert into public.signup_requests (user_id, requested_school_id, requested_other_school,
    requested_class_id, requested_club_id, consent_version, privacy_url)
  values (p_user_id, school, other_school, requested_class, requested_club, settings.consent_version, settings.privacy_url)
  returning id into request_id;
  insert into public.affiliation_requests (user_id, kind, class_id, source_signup_request_id)
    values (p_user_id, 'CLASS', requested_class, request_id);
  if requested_club is not null then
    insert into public.affiliation_requests (user_id, kind, club_id, source_signup_request_id)
      values (p_user_id, 'CLUB', requested_club, request_id);
  end if;
  insert into public.membership_audit_log (user_id, actor_id, request_id, action, details)
    values (p_user_id, p_user_id, request_id, 'MEMBER_REGISTERED', jsonb_build_object('status', initial_status));
  return request_id;
end
$$;

create function public.activate_verified_member() returns trigger
language plpgsql security definer set search_path = '' as $$
declare activated uuid;
begin
  -- A fresh verification never restores a suspended or withdrawn membership.
  update public.member_profiles set status = 'ACTIVE', updated_at = now()
    where id = new.id and status = 'PENDING' returning id into activated;
  if activated is not null then
    insert into public.membership_audit_log (user_id, actor_id, action)
      values (activated, activated, 'EMAIL_VERIFIED_MEMBER_ACTIVATED');
  end if;
  return new;
end
$$;
create trigger donuts_membership_email_verified after update of email_confirmed_at on auth.users
  for each row when (new.email_confirmed_at is not null and old.email_confirmed_at is null)
  execute function public.activate_verified_member();

with activated as (
  update public.member_profiles p set status = 'ACTIVE', updated_at = now()
  from auth.users u where u.id = p.id and u.email_confirmed_at is not null and p.status = 'PENDING'
  returning p.id
)
insert into public.membership_audit_log (user_id, actor_id, action, details)
select id, id, 'EMAIL_VERIFIED_MEMBER_ACTIVATED', jsonb_build_object('source', '0025_policy_migration')
from activated;

create function public.request_affiliation(p_kind text, p_entity_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare request_id uuid;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if not public.is_active_member() then raise exception 'member_status_blocked'; end if;
  if p_kind = 'CLASS' then
    perform 1 from public.classes where id = p_entity_id and active for share;
    if not found then raise exception 'invalid_class'; end if;
    if exists (select 1 from public.class_memberships where class_id = p_entity_id
      and user_id = auth.uid() and active) then raise exception 'already_affiliated'; end if;
  elsif p_kind = 'CLUB' then
    perform 1 from public.clubs where id = p_entity_id for share;
    if not found then raise exception 'invalid_club'; end if;
    if exists (select 1 from public.club_memberships where club_id = p_entity_id
      and user_id = auth.uid() and active) then raise exception 'already_affiliated'; end if;
  else raise exception 'invalid_affiliation_kind'; end if;
  select id into request_id from public.affiliation_requests where user_id = auth.uid()
    and kind = p_kind and coalesce(class_id, club_id) = p_entity_id and status = 'PENDING';
  if found then return request_id; end if;
  insert into public.affiliation_requests (user_id, kind, class_id, club_id)
    values (auth.uid(), p_kind, case when p_kind = 'CLASS' then p_entity_id end,
      case when p_kind = 'CLUB' then p_entity_id end) returning id into request_id;
  insert into public.membership_audit_log (user_id, actor_id, affiliation_request_id, action, details)
    values (auth.uid(), auth.uid(), request_id, 'AFFILIATION_REQUESTED',
      jsonb_build_object('kind', p_kind, 'entity_id', p_entity_id));
  return request_id;
end
$$;

create function public.review_affiliation_request(p_request_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  request public.affiliation_requests%rowtype;
  member_status text;
  reason text := nullif(btrim(p_reason), '');
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if p_decision is null or p_decision not in ('APPROVED', 'REJECTED') or char_length(reason) > 500
    or (p_decision = 'REJECTED' and reason is null) then raise exception 'invalid_decision'; end if;
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  select * into request from public.affiliation_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if not public.can_review_affiliation(request.kind, coalesce(request.class_id, request.club_id)) then
    raise exception 'forbidden';
  end if;
  if request.user_id = auth.uid() and not public.is_admin() then raise exception 'self_approval_forbidden'; end if;
  if request.status = p_decision then return; end if;
  if request.status <> 'PENDING' then raise exception 'already_reviewed'; end if;
  select status into member_status from public.member_profiles where id = request.user_id for update;
  if member_status is null or member_status in ('SUSPENDED', 'WITHDRAWN') then
    raise exception 'member_status_blocked';
  end if;
  if p_decision = 'APPROVED' then
    if member_status <> 'ACTIVE' or not exists (select 1 from auth.users
      where id = request.user_id and email_confirmed_at is not null) then raise exception 'email_not_verified'; end if;
    if request.kind = 'CLASS' then
      perform 1 from public.classes where id = request.class_id and active for share;
      if not found then raise exception 'invalid_class'; end if;
      insert into public.class_memberships (class_id, user_id) values (request.class_id, request.user_id)
        on conflict (class_id, user_id) do update set active = true, joined_at = now();
    else
      perform 1 from public.clubs where id = request.club_id for share;
      if not found then raise exception 'invalid_club'; end if;
      insert into public.club_memberships (club_id, user_id) values (request.club_id, request.user_id)
        on conflict (club_id, user_id) do update set active = true, joined_at = now();
    end if;
  end if;
  -- Neither account status, school, nor the other entity's membership is changed.
  update public.affiliation_requests set status = p_decision, decided_by = auth.uid(),
    decided_at = now(), decision_reason = reason where id = request.id;
  insert into public.membership_audit_log (user_id, actor_id, affiliation_request_id, action, details)
    values (request.user_id, auth.uid(), request.id, 'AFFILIATION_' || p_decision,
      jsonb_build_object('kind', request.kind, 'entity_id', coalesce(request.class_id, request.club_id), 'reason', reason));
end
$$;

create or replace function public.assign_membership_leader(p_kind text, p_entity_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare inserted_count integer;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  perform 1 from public.member_profiles p where p.id = p_user_id and p.status = 'ACTIVE'
    and exists (select 1 from auth.users u where u.id = p.id and u.email_confirmed_at is not null) for share;
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

create function public.remove_membership_leader(p_kind text, p_entity_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if p_kind = 'CLASS' then
    if not exists (select 1 from public.class_leaders where class_id = p_entity_id and user_id = p_user_id) then return; end if;
    if not exists (select 1 from public.class_leaders l join public.member_profiles p on p.id = l.user_id
      join auth.users u on u.id = p.id where l.class_id = p_entity_id and l.user_id <> p_user_id
      and p.status = 'ACTIVE' and u.email_confirmed_at is not null) then
      raise exception 'last_leader_requires_replacement';
    end if;
    delete from public.class_leaders where class_id = p_entity_id and user_id = p_user_id;
  elsif p_kind = 'CLUB' then
    if not exists (select 1 from public.club_leaders where club_id = p_entity_id and user_id = p_user_id) then return; end if;
    if not exists (select 1 from public.club_leaders l join public.member_profiles p on p.id = l.user_id
      join auth.users u on u.id = p.id where l.club_id = p_entity_id and l.user_id <> p_user_id
      and p.status = 'ACTIVE' and u.email_confirmed_at is not null) then
      raise exception 'last_leader_requires_replacement';
    end if;
    delete from public.club_leaders where club_id = p_entity_id and user_id = p_user_id;
  else raise exception 'invalid_leader_type'; end if;
  insert into public.membership_audit_log (user_id, actor_id, action, details)
    values (p_user_id, auth.uid(), 'LEADER_REMOVED', jsonb_build_object('kind', p_kind, 'entity_id', p_entity_id));
end
$$;

create function public.set_member_suspension(p_user_id uuid, p_suspended boolean, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  previous_status text;
  next_status text;
  reason text := nullif(btrim(p_reason), '');
  revoked_classes jsonb;
  revoked_clubs jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if p_suspended is null or reason is null or char_length(reason) > 500 then raise exception 'invalid_status_reason'; end if;
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  select status into previous_status from public.member_profiles where id = p_user_id for update;
  if previous_status is null or previous_status = 'WITHDRAWN' then raise exception 'member_status_blocked'; end if;
  if (p_suspended and previous_status = 'SUSPENDED') or (not p_suspended and previous_status <> 'SUSPENDED') then return; end if;
  if p_suspended then next_status := 'SUSPENDED';
  else
    select case when email_confirmed_at is not null then 'ACTIVE' else 'PENDING' end
      into next_status from auth.users where id = p_user_id;
  end if;
  select coalesce(jsonb_agg(class_id), '[]'::jsonb) into revoked_classes from public.class_leaders where user_id = p_user_id;
  select coalesce(jsonb_agg(club_id), '[]'::jsonb) into revoked_clubs from public.club_leaders where user_id = p_user_id;
  -- Suspension is immediate even for the last leader. Restore never resurrects
  -- assignments, including assignments left on suspended accounts before 0025.
  delete from public.class_leaders where user_id = p_user_id;
  delete from public.club_leaders where user_id = p_user_id;
  update public.member_profiles set status = next_status, updated_at = now() where id = p_user_id;
  insert into public.membership_audit_log (user_id, actor_id, action, details)
    values (p_user_id, auth.uid(), case when p_suspended then 'MEMBER_SUSPENDED' else 'MEMBER_RESTORED' end,
      jsonb_build_object('before', previous_status, 'after', next_status, 'reason', reason,
        'revoked_classes', revoked_classes, 'revoked_clubs', revoked_clubs));
end
$$;

revoke all on function public.can_review_affiliation(text, uuid), public.activate_verified_member(),
  public.request_affiliation(text, uuid), public.review_affiliation_request(uuid, text, text),
  public.remove_membership_leader(text, uuid, uuid), public.set_member_suspension(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.can_review_affiliation(text, uuid), public.request_affiliation(text, uuid),
  public.review_affiliation_request(uuid, text, text), public.remove_membership_leader(text, uuid, uuid),
  public.set_member_suspension(uuid, boolean, text) to authenticated;

commit;
