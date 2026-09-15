-- Complete member operations and DONUTS-hosted meetings without deleting history.
begin;

alter table public.member_profiles add column revision integer not null default 1;
create function public.bump_member_revision() returns trigger language plpgsql set search_path='' as $$
begin new.revision=old.revision+1; new.updated_at=clock_timestamp(); return new; end $$;
create trigger member_profile_revision before update on public.member_profiles for each row execute function public.bump_member_revision();

create table public.member_withdrawals(
  user_id uuid primary key references public.member_profiles(id),
  requested_by uuid not null references auth.users(id),
  status text not null default 'AUTH_PENDING' check(status in ('AUTH_PENDING','COMPLETE')),
  requested_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz
);
alter table public.member_withdrawals enable row level security;
revoke all on public.member_withdrawals from anon,authenticated;
grant select on public.member_withdrawals to authenticated;
create policy withdrawals_admin_read on public.member_withdrawals for select to authenticated using(public.is_admin());

create function public.update_member_profile(p_user uuid,p_expected integer,p_payload jsonb,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare v public.member_profiles; school uuid=nullif(p_payload->>'school_id','')::uuid; other text=nullif(btrim(p_payload->>'other_school_name'),'');
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.is_admin() then raise exception 'forbidden'; end if;
 select * into v from public.member_profiles where id=p_user for update;
 if not found or v.status='WITHDRAWN' then raise exception 'member_status_blocked'; end if;
 if v.revision is distinct from p_expected then raise exception 'stale_preview'; end if;
 if nullif(btrim(p_reason),'') is null or length(p_reason)>500 then raise exception 'reason_required'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or length(btrim(coalesce(p_payload->>'name',''))) not between 1 and 80
   or coalesce(p_payload->>'phone','') !~ '^\+?[0-9]{8,15}$' then raise exception 'invalid_profile'; end if;
 if school is not null then
   if not exists(select 1 from public.schools where id=school and (active or id=v.school_id)) then raise exception 'invalid_school'; end if;
   other=null;
 elsif other is null or length(other)>120 then raise exception 'invalid_school'; end if;
 update public.member_profiles set name=btrim(p_payload->>'name'),phone=p_payload->>'phone',school_id=school,other_school_name=other where id=p_user;
 insert into public.membership_audit_log(user_id,actor_id,action,details) values(p_user,auth.uid(),'PROFILE_UPDATED',
   jsonb_build_object('reason',p_reason,'before',jsonb_build_object('name',v.name,'phone',v.phone,'school_id',v.school_id,'other_school_name',v.other_school_name),'after',p_payload));
end $$;

create function public.admin_member_directory(p_filters jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; total integer; q text=lower(left(btrim(coalesce(p_filters->>'q','')),80));
 page_number integer=greatest(1,least(10000,coalesce((p_filters->>'page')::integer,1)));
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 with matches as (
 select p.*,u.email,coalesce(s.name,p.other_school_name) school_name,w.status withdrawal_status,
   coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'active',m.active) order by c.name) from public.class_memberships m join public.classes c on c.id=m.class_id where m.user_id=p.id),'[]'::jsonb) classes,
   coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'active',m.active) order by c.name) from public.club_memberships m join public.clubs c on c.id=m.club_id where m.user_id=p.id),'[]'::jsonb) clubs,
   coalesce((select jsonb_agg(to_jsonb(leaders) order by name) from (
     select c.id,c.name,'CLASS'::text kind from public.class_leaders l join public.classes c on c.id=l.class_id where l.user_id=p.id
     union all select c.id,c.name,'CLUB'::text kind from public.club_leaders l join public.clubs c on c.id=l.club_id where l.user_id=p.id
   ) leaders),'[]'::jsonb) leaders
 from public.member_profiles p join auth.users u on u.id=p.id left join public.schools s on s.id=p.school_id left join public.member_withdrawals w on w.user_id=p.id
 where (q='' or position(q in lower(p.name||' '||p.phone||' '||coalesce(u.email,'')))>0)
 and (nullif(p_filters->>'user_id','') is null or p.id=(p_filters->>'user_id')::uuid)
 and (coalesce(p_filters->>'status','ALL')='ALL' or p.status=p_filters->>'status')
 and (nullif(p_filters->>'school_id','') is null or p.school_id=(p_filters->>'school_id')::uuid)
 and (nullif(p_filters->>'class_id','') is null or exists(select 1 from public.class_memberships m where m.user_id=p.id and m.active and m.class_id=(p_filters->>'class_id')::uuid))
 and (nullif(p_filters->>'club_id','') is null or exists(select 1 from public.club_memberships m where m.user_id=p.id and m.active and m.club_id=(p_filters->>'club_id')::uuid))
 ), numbered as (select * from matches order by created_at desc,id offset (page_number-1)*50 limit 50)
 select (select coalesce(jsonb_agg(to_jsonb(numbered) order by created_at desc,id),'[]'::jsonb) from numbered),
   (select count(*) from matches) into result,total;
 return jsonb_build_object('members',result,'count',total,'page',page_number);
end $$;

create function public.admin_set_member_affiliation(p_user uuid,p_kind text,p_entity uuid,p_active boolean,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare request_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if p_kind not in ('CLASS','CLUB') or p_kind is null then raise exception 'invalid_entity'; end if;
 if nullif(btrim(p_reason),'') is null or length(p_reason)>500 then raise exception 'reason_required'; end if;
 if not exists(select 1 from public.member_profiles where id=p_user and status<>'WITHDRAWN') then raise exception 'member_status_blocked'; end if;
 if not p_active then perform public.remove_entity_member(p_kind,p_entity,p_user,p_reason); return; end if;
 if not public.domain_member_active(p_user) then raise exception 'member_status_blocked'; end if;
 if (p_kind='CLASS' and exists(select 1 from public.class_memberships where user_id=p_user and class_id=p_entity and active))
   or (p_kind='CLUB' and exists(select 1 from public.club_memberships where user_id=p_user and club_id=p_entity and active)) then return; end if;
 select id into request_id from public.affiliation_requests where user_id=p_user and kind=p_kind and coalesce(class_id,club_id)=p_entity and status='PENDING';
 if request_id is null then
   insert into public.affiliation_requests(user_id,kind,class_id,club_id) values(p_user,p_kind,case when p_kind='CLASS' then p_entity end,case when p_kind='CLUB' then p_entity end) returning id into request_id;
 end if;
 perform public.review_affiliation_request(request_id,'APPROVED',p_reason);
end $$;

-- Redact scalar personal values inside nested historical snapshots, retaining events/IDs.
create function public.redact_member_values(p_value jsonb,p_terms text[],p_user uuid default null,p_subject uuid default null) returns jsonb
language plpgsql immutable set search_path='' as $$
declare result jsonb; value_text text; term text; subject_id uuid:=p_subject; subject_text text;
begin
 case jsonb_typeof(p_value)
 when 'object' then
   subject_text=coalesce(p_value->>'user_id',p_value->>'id');
   if subject_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then subject_id=subject_text::uuid; end if;
   select coalesce(jsonb_object_agg(key,case
     when key in ('action','status','kind','mark','decision','source_kind','mode') or key ~ '_at$' then value
     when p_user is not null and subject_id is not null and subject_id<>p_user
       and key in ('name','phone','username','email','other_school_name','snapshot_name','snapshot_username') then value
     else public.redact_member_values(value,p_terms,p_user,subject_id) end),'{}'::jsonb) into result from jsonb_each(p_value);
   return result;
 when 'array' then select coalesce(jsonb_agg(public.redact_member_values(value,p_terms,p_user,p_subject) order by ordinality),'[]'::jsonb) into result from jsonb_array_elements(p_value) with ordinality; return result;
 when 'string' then
   value_text=p_value#>>'{}';
   -- Historical foreign keys must survive even when a short name matches part of an ID.
   if value_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return p_value; end if;
   foreach term in array p_terms loop if term is not null and term<>'' then value_text=replace(value_text,term,'[삭제됨]'); end if; end loop;
   return to_jsonb(value_text);
 else return p_value;
 end case;
end $$;
revoke all on function public.redact_member_values(jsonb,text[],uuid,uuid) from public,anon,authenticated;

create function public.begin_member_withdrawal(p_user uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare v public.member_profiles; terms text[]; affected_sessions uuid[]; a record;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.is_admin() or p_user=auth.uid() then raise exception 'forbidden'; end if;
 if exists(select 1 from auth.users u join public.admin_emails e on lower(e.email)=lower(u.email) where u.id=p_user) then raise exception 'admin_account'; end if;
 if nullif(btrim(p_reason),'') is null or length(p_reason)>500 then raise exception 'reason_required'; end if;
 select * into v from public.member_profiles where id=p_user for update;
 if not found then raise exception 'member_status_blocked'; end if;
 if exists(select 1 from public.member_withdrawals where user_id=p_user) then return; end if;
 select array_agg(value order by length(value) desc) into terms from (select distinct value from (
   select unnest(array[v.name,v.phone,v.username,v.other_school_name,(select email::text from auth.users where id=p_user)]) value
   union all select snapshot_name from public.class_attendance where user_id=p_user
   union all select snapshot_username from public.class_attendance where user_id=p_user
   union all select t#>>'{}' from public.membership_audit_log l cross join lateral jsonb_path_query(l.details,'$.**.name') t where l.user_id=p_user
   union all select t#>>'{}' from public.membership_audit_log l cross join lateral jsonb_path_query(l.details,'$.**.phone') t where l.user_id=p_user
   union all select t#>>'{}' from public.membership_audit_log l cross join lateral jsonb_path_query(l.details,'$.**.username') t where l.user_id=p_user
   union all select t#>>'{}' from public.membership_audit_log l cross join lateral jsonb_path_query(l.details,'$.**.email') t where l.user_id=p_user
   union all select t#>>'{}' from public.membership_audit_log l cross join lateral jsonb_path_query(l.details,'$.**.other_school_name') t where l.user_id=p_user
   union all select requested_other_school from public.signup_requests where user_id=p_user
 ) identifiers where value is not null and value<>'') distinct_identifiers;
 select array_agg(distinct session_id) into affected_sessions from (
   select session_id from public.class_attendance where user_id=p_user
   union all select session_id from public.xp_ledger where user_id=p_user or actor_id=p_user
   union all select s.id from public.class_sessions s join public.class_memberships m on m.class_id=s.class_id where m.user_id=p_user
   union all select session_id from public.entity_operation_log where actor_id=p_user or before_state::text like '%'||p_user::text||'%' or after_state::text like '%'||p_user::text||'%'
 ) sessions where session_id is not null;
 update public.member_profiles set status='WITHDRAWN',name='탈퇴 회원',username=null,phone='00000000',school_id=null,other_school_name='탈퇴 회원',consent_version='withdrawn' where id=p_user;
 delete from public.class_leaders where user_id=p_user;
 delete from public.club_leaders where user_id=p_user;
 update public.class_memberships set active=false where user_id=p_user;
 update public.club_memberships set active=false where user_id=p_user;
 update public.class_attendance set snapshot_name='탈퇴 회원',snapshot_username=null where user_id=p_user;
 update public.signup_requests set requested_school_id=null,requested_other_school='탈퇴 회원',consent_version='withdrawn',privacy_url='withdrawn',decision_reason=null where user_id=p_user;
 update public.affiliation_requests set decision_reason=null,status=case when status='PENDING' then 'REJECTED' else status end,
   decided_by=case when status='PENDING' then auth.uid() else decided_by end,decided_at=case when status='PENDING' then clock_timestamp() else decided_at end where user_id=p_user;
 update public.membership_audit_log set details=public.redact_member_values(details,terms,p_user,user_id) where user_id=p_user or actor_id=p_user or details::text like '%'||p_user::text||'%';
 update public.entity_operation_log set before_state=public.redact_member_values(before_state,terms,p_user),after_state=public.redact_member_values(after_state,terms,p_user),reason=public.redact_member_values(to_jsonb(reason),terms)#>>'{}'
   where actor_id=p_user or session_id=any(affected_sessions) or before_state::text like '%'||p_user::text||'%' or after_state::text like '%'||p_user::text||'%';
 -- XP and cancellation reasons copy the operation text. Preserve amounts, rows and dates.
 update public.xp_ledger set reason=public.redact_member_values(to_jsonb(reason),terms)#>>'{}'
   where user_id=p_user or actor_id=p_user or session_id=any(affected_sessions);
 update public.class_sessions set cancellation_reason=public.redact_member_values(to_jsonb(cancellation_reason),terms)#>>'{}'
   where id=any(affected_sessions) and cancellation_reason is not null;
 update public.class_successions set execution_snapshot=public.redact_member_values(execution_snapshot,terms,p_user) where execution_snapshot::text like '%'||p_user::text||'%';
 update public.notification_emails e set recipient='withdrawn@invalid',payload=null,provider_id=null,last_error=null,lease_id=null,leased_until=null,status='CANCELLED'
   from public.member_notifications n where e.notification_id=n.id and n.user_id=p_user;
 update public.member_notifications set title='탈퇴 회원 알림',body='',expires_at=clock_timestamp() where user_id=p_user;
 for a in select distinct meeting_id from public.meeting_applications where user_id=p_user and status in ('CONFIRMED','WAITLIST','OFFERED') loop perform public.reconcile_meeting_waitlist(a.meeting_id); end loop;
 update public.meeting_operation_log set before_state=public.redact_member_values(before_state,terms,p_user),after_state=public.redact_member_values(after_state,terms,p_user),reason=public.redact_member_values(to_jsonb(reason),terms)#>>'{}'
   where actor_id=p_user or before_state::text like '%'||p_user::text||'%' or application_id in(select id from public.meeting_applications where user_id=p_user);
 insert into public.member_withdrawals(user_id,requested_by) values(p_user,auth.uid());
 insert into public.membership_audit_log(user_id,actor_id,action,details) values(p_user,auth.uid(),'MEMBER_WITHDRAWN',jsonb_build_object('reason',public.redact_member_values(to_jsonb(p_reason),terms)));
end $$;

-- Called after Supabase Auth's idempotent soft deletion has scrubbed the Auth identity.
create function public.finish_member_withdrawal(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if not exists(select 1 from public.member_profiles where id=p_user and status='WITHDRAWN') then raise exception 'member_status_blocked'; end if;
 if not exists(select 1 from auth.users where id=p_user and deleted_at is not null) then raise exception 'withdrawal_auth_pending'; end if;
 -- GoTrue keeps actor identifiers at the top level and admin-action subjects in traits.
 -- Scrub only the target's personal fields; preserve event IDs and the other actor's data.
 if to_regclass('auth.audit_log_entries') is not null then
   execute $audit$
     with target_events as (
       select id,payload::jsonb data from auth.audit_log_entries
       where payload->>'user_id'=$1 or payload->>'actor_id'=$1 or payload->'traits'->>'user_id'=$1
     ), actor_cleaned as (
       select id,case when data->>'actor_id'=$1 then data-array['actor_username','actor_name','actor_email','actor_phone'] else data end data
       from target_events
     ), subject_cleaned as (
       select id,case when data->>'user_id'=$1 then data-array['user_email','user_phone','user_name','email','phone','name','full_name','username','user_metadata','identity_data'] else data end data
       from actor_cleaned
     )
     update auth.audit_log_entries e set payload=(case
       when data->'traits'->>'user_id'=$1 or (data->>'actor_id'=$1 and data->'traits'->>'user_id' is null and jsonb_typeof(data->'traits')='object') then
         jsonb_set(data,'{traits}',(data->'traits')-array['user_email','user_phone','user_name','email','phone','name','full_name','username','user_metadata','identity_data'])
       else data end)||jsonb_build_object('redacted',true),ip_address=''
     from subject_cleaned where e.id=subject_cleaned.id
   $audit$ using p_user::text;
 end if;
 update public.member_withdrawals set status='COMPLETE',completed_at=coalesce(completed_at,clock_timestamp()) where user_id=p_user;
end $$;

alter table public.club_meetings alter column club_id drop not null;
create index meeting_display_order on public.club_meetings(hot desc,scheduled_at,id);
create or replace function public.eligible_meeting_member(p_meeting uuid,p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.domain_member_active(p_user) and exists(select 1 from public.club_meetings m left join public.clubs c on c.id=m.club_id where m.id=p_meeting
 and (m.club_id is null or (c.archived_at is null and (m.guest_allowed or exists(select 1 from public.club_memberships cm where cm.club_id=m.club_id and cm.user_id=p_user and cm.active)))));
$$;

create function public.get_meeting_summaries(p_manage boolean default false,p_club uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.domain_current_member() then raise exception 'forbidden'; end if;
 select coalesce(jsonb_agg(row_data order by hot desc,scheduled_at,id),'[]'::jsonb) into result from (
   select m.id,m.hot,m.scheduled_at,to_jsonb(m)||jsonb_build_object('club_name',coalesce(c.name,'DO:NUTS'),
     'confirmed',(select count(*) from public.meeting_applications a where a.meeting_id=m.id and a.status='CONFIRMED'),
     'reserved',(select count(*) from public.meeting_applications a where a.meeting_id=m.id and a.status='OFFERED' and a.offer_expires_at>clock_timestamp()),
     'waiting',(select count(*) from public.meeting_applications a where a.meeting_id=m.id and a.status='WAITLIST'),
     'application',(select jsonb_build_object('status',a.status,'offer_expires_at',a.offer_expires_at) from public.meeting_applications a where a.meeting_id=m.id and a.user_id=auth.uid() order by a.queue_number desc limit 1)) row_data
   from public.club_meetings m left join public.clubs c on c.id=m.club_id
   where (p_club is null or m.club_id=p_club)
   and case when p_manage then public.can_manage_club_meeting(m.id) else
     (m.completed_at is null or m.completed_at>clock_timestamp()-interval '24 hours') and (public.is_admin() or public.eligible_meeting_member(m.id,auth.uid())) end
 ) rows;
 return result;
end $$;

revoke all on function public.bump_member_revision(),public.update_member_profile(uuid,integer,jsonb,text),public.admin_member_directory(jsonb),public.admin_set_member_affiliation(uuid,text,uuid,boolean,text),public.begin_member_withdrawal(uuid,text),public.finish_member_withdrawal(uuid),public.get_meeting_summaries(boolean,uuid) from public,anon,authenticated;
grant execute on function public.update_member_profile(uuid,integer,jsonb,text),public.admin_member_directory(jsonb),public.admin_set_member_affiliation(uuid,text,uuid,boolean,text),public.begin_member_withdrawal(uuid,text),public.finish_member_withdrawal(uuid),public.get_meeting_summaries(boolean,uuid) to authenticated;

create or replace function public.guard_affiliation_entity_lifecycle() returns trigger
language plpgsql security definer set search_path = '' as $$
declare course public.classes%rowtype; archived timestamptz;
begin
  if tg_op='UPDATE' and public.is_admin()
    and exists(select 1 from public.member_profiles where id=new.user_id and status='WITHDRAWN')
    and (to_jsonb(new)-'status'-'decision_reason'-'decided_by'-'decided_at')=(to_jsonb(old)-'status'-'decision_reason'-'decided_by'-'decided_at')
    and (new.status=old.status or (old.status='PENDING' and new.status='REJECTED')) then return new; end if;
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

-- Existing meeting transaction functions are redefined below with NULL club = DONUTS.

create or replace function public.save_club_meeting(p_id uuid,p_expected integer,p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.club_meetings; v_id uuid=p_id; v_club uuid; v_capacity integer; v_used integer; v_hot boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 v_club=(p_payload->>'club_id')::uuid;
 if p_id is null then
   if not public.can_review_affiliation('CLUB',v_club) then raise exception 'forbidden'; end if;
 else
   if not public.can_manage_club_meeting(p_id) then raise exception 'forbidden'; end if;
   select * into v from public.club_meetings where id=p_id for update;
   if not found or v.status<>'OPEN' then raise exception 'meeting_closed'; end if;
   if v.revision is distinct from p_expected then raise exception 'stale_preview'; end if;
   if v_club is distinct from v.club_id then raise exception 'invalid_club'; end if;
   if nullif(btrim(p_payload->>'reason'),'') is null then raise exception 'reason_required'; end if;
 end if;
 if v_club is not null and not exists(select 1 from public.clubs where id=v_club and archived_at is null) then raise exception 'invalid_club'; end if;
 if nullif(btrim(p_payload->>'title'),'') is null or nullif(btrim(p_payload->>'place'),'') is null
   or not isfinite((p_payload->>'scheduled_at')::timestamptz)
   or coalesce((p_payload->>'hold_hours')::integer,12)<1 then raise exception 'invalid_meeting'; end if;
 v_capacity=nullif((p_payload->>'capacity')::integer,0);
 if v_capacity<0 then raise exception 'invalid_meeting'; end if;
 v_hot=coalesce((p_payload->>'hot')::boolean,false);
 if not public.is_admin() then
   if v_hot is distinct from coalesce(v.hot,false) then raise exception 'forbidden'; end if;
 end if;
 if p_id is not null then
   perform public.reconcile_meeting_waitlist(p_id);
   select count(*) into v_used from public.meeting_applications where meeting_id=p_id and status in ('CONFIRMED','OFFERED');
   if v_capacity is not null and v_capacity<v_used then raise exception 'capacity_below_reservations'; end if;
   update public.club_meetings set title=btrim(p_payload->>'title'),description=coalesce(p_payload->>'description',''),
     place=btrim(p_payload->>'place'),scheduled_at=(p_payload->>'scheduled_at')::timestamptz,capacity=v_capacity,
     guest_allowed=(v_club is null or coalesce((p_payload->>'guest_allowed')::boolean,false)),signup_open=coalesce((p_payload->>'signup_open')::boolean,true),
     hold_hours=coalesce((p_payload->>'hold_hours')::integer,12),hot=v_hot,revision=revision+1 where id=p_id;
 else
   insert into public.club_meetings(club_id,created_by,title,description,place,scheduled_at,capacity,guest_allowed,signup_open,hold_hours,hot)
     values(v_club,auth.uid(),btrim(p_payload->>'title'),coalesce(p_payload->>'description',''),btrim(p_payload->>'place'),
       (p_payload->>'scheduled_at')::timestamptz,v_capacity,(v_club is null or coalesce((p_payload->>'guest_allowed')::boolean,false)),
       coalesce((p_payload->>'signup_open')::boolean,true),coalesce((p_payload->>'hold_hours')::integer,12),v_hot)
     returning id into v_id;
 end if;
 insert into public.meeting_operation_log(meeting_id,actor_id,action,reason,before_state,after_state)
   values(v_id,auth.uid(),case when p_id is null then 'CREATED' else 'UPDATED' end,p_payload->>'reason',
     case when p_id is not null then to_jsonb(v) end,p_payload);
 perform public.reconcile_meeting_waitlist(v_id);
 return v_id;
end;
$$;

create or replace function public.get_club_meeting_board(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.club_meetings; v_manage boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.can_read_club_meeting(p_id) then raise exception 'forbidden'; end if;
 perform public.reconcile_meeting_waitlist(p_id);
 select * into v from public.club_meetings where id=p_id;
 v_manage=public.can_manage_club_meeting(p_id);
 return jsonb_build_object('meeting',to_jsonb(v),'can_manage',v_manage,'eligible',public.eligible_meeting_member(p_id,auth.uid()),
   'club_name',coalesce((select name from public.clubs where id=v.club_id),'DO:NUTS'),
   'confirmed',(select count(*) from public.meeting_applications where meeting_id=p_id and status='CONFIRMED'),
   'reserved',(select count(*) from public.meeting_applications where meeting_id=p_id and status='OFFERED'),
   'waiting',(select count(*) from public.meeting_applications where meeting_id=p_id and status='WAITLIST'),
   'application',(select to_jsonb(a) from public.meeting_applications a where a.meeting_id=p_id and a.user_id=auth.uid() order by a.queue_number desc limit 1),
   'people',case when v_manage then (select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('name',p.name,'username',p.username) order by a.queue_number),'[]'::jsonb)
     from public.meeting_applications a join public.member_profiles p on p.id=a.user_id where a.meeting_id=p_id) else '[]'::jsonb end);
end;
$$;

notify pgrst, 'reload schema';
commit;
