-- Apply before deploying the email-only signup form.
-- Existing identities, usernames, attendance snapshots and XP are preserved.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- create_membership_application already reads missing JSON username as NULL.
-- The Auth UUID remains the only identity used by memberships and activity.
alter table public.member_profiles alter column username drop not null;
alter table public.class_attendance alter column snapshot_username drop not null;

comment on column public.member_profiles.username is
  'Historical username only. Email-only signup omits it; membership identity is the Auth UUID.';
comment on column public.class_attendance.snapshot_username is
  'Historical username snapshot, nullable for email-only members. Attendance identity is user_id.';

-- Keep the original authorization boundaries. Do not require a historical
-- username to label a member or substitute their email in leader-facing lists.
create or replace function public.get_entity_leader_candidates() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', u.id,
    'label', coalesce(p.name || ' / ' || left(p.id::text, 8), u.email, 'Administrator'),
    'is_admin', exists (select 1 from public.admin_emails a where lower(a.email) = lower(u.email)))
    order by coalesce(p.name, u.email)), '[]'::jsonb) into result
  from auth.users u left join public.member_profiles p on p.id = u.id where public.eligible_entity_leader(u.id);
  return result;
end $$;

create or replace function public.get_entity_people(p_kind text, p_entity_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare leaders jsonb; members jsonb;
begin
  if auth.uid() is null or not public.can_review_affiliation(p_kind, p_entity_id) then raise exception 'forbidden'; end if;
  if p_kind is null or p_kind not in ('CLASS', 'CLUB') then raise exception 'invalid_affiliation_kind'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', l.user_id,
    'label', coalesce(p.name || ' / ' || left(p.id::text, 8), 'Administrator'),
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

revoke all on function public.get_entity_leader_candidates(), public.get_entity_people(text, uuid)
  from public, anon;
grant execute on function public.get_entity_leader_candidates(), public.get_entity_people(text, uuid)
  to authenticated;

-- The service-role-only username lookup is retained for the previous deployed
-- bundle during rollout. The new login action never calls it. Do not expose it
-- to anon/authenticated or recreate accounts to switch their login identifier.
commit;
