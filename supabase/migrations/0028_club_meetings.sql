-- Club meetings are separate from classes and retained public schedule events.
begin;
create table public.club_meetings(
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id),
  created_by uuid not null references auth.users(id),
  title text not null check(length(btrim(title)) between 1 and 160),
  description text not null default '',
  place text not null,
  scheduled_at timestamptz not null check(isfinite(scheduled_at)),
  capacity integer check(capacity is null or capacity>0),
  guest_allowed boolean not null default false,
  signup_open boolean not null default true,
  hold_hours integer not null default 12 check(hold_hours>0),
  hot boolean not null default false,
  status text not null default 'OPEN' check(status in ('OPEN','COMPLETED','CANCELLED')),
  completed_at timestamptz,
  archived_at timestamptz,
  revision integer not null default 1 check(revision>0),
  created_at timestamptz not null default clock_timestamp(),
  check((status='OPEN')=(completed_at is null))
);
create table public.meeting_applications(
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.club_meetings(id),
  user_id uuid not null references public.member_profiles(id),
  queue_number bigint generated always as identity,
  status text not null check(status in ('CONFIRMED','WAITLIST','OFFERED','DECLINED','EXPIRED','CANCELLED','INELIGIBLE','ENDED')),
  offered_at timestamptz,
  offer_expires_at timestamptz,
  confirmed_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create unique index meeting_active_application on public.meeting_applications(meeting_id,user_id)
  where status in ('CONFIRMED','WAITLIST','OFFERED');
create index meeting_waitlist_order on public.meeting_applications(meeting_id,status,queue_number);
create table public.meeting_operation_log(
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.club_meetings(id),
  application_id uuid references public.meeting_applications(id),
  actor_id uuid references auth.users(id),
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.club_meetings enable row level security;
alter table public.meeting_applications enable row level security;
alter table public.meeting_operation_log enable row level security;
revoke all on public.club_meetings,public.meeting_applications,public.meeting_operation_log from anon,authenticated;
grant select on public.club_meetings,public.meeting_applications,public.meeting_operation_log to authenticated;

create function public.can_manage_club_meeting(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_admin() or exists(select 1 from public.club_meetings m where m.id=p_id and m.created_by=auth.uid()
   and public.can_review_affiliation('CLUB',m.club_id));
$$;
create function public.can_read_club_meeting(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.can_manage_club_meeting(p_id) or (public.domain_current_member() and exists(
   select 1 from public.club_meetings m where m.id=p_id and (m.completed_at is null
     or m.completed_at>clock_timestamp()-interval '24 hours'
     or exists(select 1 from public.meeting_applications a where a.meeting_id=m.id and a.user_id=auth.uid()))));
$$;
create function public.eligible_meeting_member(p_meeting uuid,p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.domain_member_active(p_user) and exists(select 1 from public.club_meetings m
   join public.clubs c on c.id=m.club_id where m.id=p_meeting and c.archived_at is null
   and (m.guest_allowed or exists(select 1 from public.club_memberships cm where cm.club_id=m.club_id and cm.user_id=p_user and cm.active)));
$$;
create policy meeting_read on public.club_meetings for select to authenticated using(public.can_read_club_meeting(id));
create policy meeting_applications_read on public.meeting_applications for select to authenticated
  using(public.can_manage_club_meeting(meeting_id) or (user_id=auth.uid() and public.domain_current_member()));
create policy meeting_log_read on public.meeting_operation_log for select to authenticated using(public.can_manage_club_meeting(meeting_id));

create function public.set_meeting_application_status(p_id uuid,p_status text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare v public.meeting_applications;
begin
 select * into v from public.meeting_applications where id=p_id;
 if v.status=p_status then return; end if;
 update public.meeting_applications set status=p_status,
   confirmed_at=case when p_status='CONFIRMED' then clock_timestamp() else confirmed_at end,
   ended_at=case when p_status in ('DECLINED','EXPIRED','CANCELLED','INELIGIBLE','ENDED') then clock_timestamp() else null end
 where id=p_id;
 insert into public.meeting_operation_log(meeting_id,application_id,actor_id,action,reason,before_state,after_state)
 values(v.meeting_id,p_id,auth.uid(),'APPLICATION_'||p_status,p_reason,to_jsonb(v),jsonb_build_object('status',p_status));
 -- A queued email must never advertise an offer which has already ended.
 if p_status<>'OFFERED' then
   update public.member_notifications set expires_at=least(coalesce(expires_at,clock_timestamp()),clock_timestamp())
   where event_key='meeting-offer:'||p_id;
 end if;
end;
$$;

create function public.reconcile_meeting_waitlist(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v public.club_meetings; a record; v_used integer; v_expiry timestamptz;
begin
 select * into v from public.club_meetings where id=p_id for update;
 if not found then return; end if;
 if v.status<>'OPEN' then
   for a in select id from public.meeting_applications where meeting_id=p_id and status in ('WAITLIST','OFFERED') loop
     perform public.set_meeting_application_status(a.id,'ENDED','Meeting closed');
   end loop;
   if v.completed_at<=clock_timestamp()-interval '24 hours' then
     update public.club_meetings set archived_at=coalesce(archived_at,completed_at+interval '24 hours') where id=p_id;
   end if;
   return;
 end if;
 for a in select * from public.meeting_applications where meeting_id=p_id and status in ('WAITLIST','OFFERED','CONFIRMED') order by queue_number loop
   if not public.eligible_meeting_member(p_id,a.user_id) then
     perform public.set_meeting_application_status(a.id,'INELIGIBLE','Membership no longer eligible');
   elsif a.status='OFFERED' and a.offer_expires_at<=clock_timestamp() then
     perform public.set_meeting_application_status(a.id,'EXPIRED','Offer confirmation expired');
   end if;
 end loop;
 if not v.signup_open then return; end if;
 select count(*) into v_used from public.meeting_applications where meeting_id=p_id and status in ('CONFIRMED','OFFERED');
 for a in select * from public.meeting_applications where meeting_id=p_id and status='WAITLIST' order by queue_number loop
   exit when v.capacity is not null and v_used>=v.capacity;
   v_expiry=clock_timestamp()+make_interval(hours=>v.hold_hours);
   update public.meeting_applications set status='OFFERED',offered_at=clock_timestamp(),offer_expires_at=v_expiry where id=a.id;
   insert into public.meeting_operation_log(meeting_id,application_id,actor_id,action,before_state,after_state)
     values(p_id,a.id,auth.uid(),'APPLICATION_OFFERED',to_jsonb(a),jsonb_build_object('expires_at',v_expiry));
   perform public.enqueue_member_notification(a.user_id,'meeting-offer:'||a.id,'MEETING_OFFER','모임 참여 자리가 났습니다',
     v.title||' 모임에 참여할 수 있습니다. 알림을 받은 시점부터 '||v.hold_hours||'시간 안에 직접 참여를 확정해 주세요.',
     '/meetings/'||p_id,v_expiry);
   v_used=v_used+1;
 end loop;
end;
$$;

create function public.save_club_meeting(p_id uuid,p_expected integer,p_payload jsonb) returns uuid
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
 if not exists(select 1 from public.clubs where id=v_club and archived_at is null) then raise exception 'invalid_club'; end if;
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
     guest_allowed=coalesce((p_payload->>'guest_allowed')::boolean,false),signup_open=coalesce((p_payload->>'signup_open')::boolean,true),
     hold_hours=coalesce((p_payload->>'hold_hours')::integer,12),hot=v_hot,revision=revision+1 where id=p_id;
 else
   insert into public.club_meetings(club_id,created_by,title,description,place,scheduled_at,capacity,guest_allowed,signup_open,hold_hours,hot)
     values(v_club,auth.uid(),btrim(p_payload->>'title'),coalesce(p_payload->>'description',''),btrim(p_payload->>'place'),
       (p_payload->>'scheduled_at')::timestamptz,v_capacity,coalesce((p_payload->>'guest_allowed')::boolean,false),
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

create function public.apply_club_meeting(p_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.club_meetings; v_used integer; v_id uuid; v_status text;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.eligible_meeting_member(p_id,auth.uid()) then raise exception 'meeting_membership_required'; end if;
 select * into v from public.club_meetings where id=p_id for update;
 if not found or v.status<>'OPEN' or not v.signup_open then raise exception 'meeting_closed'; end if;
 perform public.reconcile_meeting_waitlist(p_id);
 select id into v_id from public.meeting_applications where meeting_id=p_id and user_id=auth.uid() and status in ('CONFIRMED','WAITLIST','OFFERED');
 if v_id is not null then return v_id; end if;
 select count(*) into v_used from public.meeting_applications where meeting_id=p_id and status in ('CONFIRMED','OFFERED');
 v_status=case when (v.capacity is null or v_used<v.capacity)
   and not exists(select 1 from public.meeting_applications where meeting_id=p_id and status='WAITLIST') then 'CONFIRMED' else 'WAITLIST' end;
 insert into public.meeting_applications(meeting_id,user_id,status,confirmed_at)
   values(p_id,auth.uid(),v_status,case when v_status='CONFIRMED' then clock_timestamp() end) returning id into v_id;
 insert into public.meeting_operation_log(meeting_id,application_id,actor_id,action,after_state)
   values(p_id,v_id,auth.uid(),'APPLICATION_'||v_status,jsonb_build_object('status',v_status));
 return v_id;
end;
$$;

create function public.respond_meeting_application(p_id uuid,p_action text) returns text
language plpgsql security definer set search_path='' as $$
declare a public.meeting_applications; v public.club_meetings;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.domain_current_member() then raise exception 'forbidden'; end if;
 select * into a from public.meeting_applications where id=p_id and user_id=auth.uid();
 if not found then raise exception 'forbidden'; end if;
 if p_action is null or p_action not in ('CONFIRM','DECLINE','CANCEL') then raise exception 'invalid_meeting'; end if;
 select * into v from public.club_meetings where id=a.meeting_id;
 if v.status<>'OPEN' then raise exception 'meeting_closed'; end if;
 perform public.reconcile_meeting_waitlist(a.meeting_id);
 select * into a from public.meeting_applications where id=p_id;
 if p_action='CONFIRM' and a.status='OFFERED' then
   perform public.set_meeting_application_status(p_id,'CONFIRMED','Member confirmed reserved offer');
 elsif p_action='DECLINE' and a.status='OFFERED' then
   perform public.set_meeting_application_status(p_id,'DECLINED','Member declined reserved offer');
 elsif p_action='CANCEL' and a.status in ('WAITLIST','OFFERED','CONFIRMED') then
   perform public.set_meeting_application_status(p_id,'CANCELLED','Member cancelled application');
 end if;
 perform public.reconcile_meeting_waitlist(a.meeting_id);
 return (select status from public.meeting_applications where id=p_id);
end;
$$;

create function public.close_club_meeting(p_id uuid,p_expected integer,p_status text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare v public.club_meetings; a record;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.can_manage_club_meeting(p_id) then raise exception 'forbidden'; end if;
 select * into v from public.club_meetings where id=p_id;
 if not found or v.status<>'OPEN' then raise exception 'meeting_closed'; end if;
 if v.revision is distinct from p_expected then raise exception 'stale_preview'; end if;
 if p_status is null or p_status not in ('COMPLETED','CANCELLED') or nullif(btrim(p_reason),'') is null or length(p_reason)>500 then raise exception 'reason_required'; end if;
 update public.club_meetings set status=p_status,signup_open=false,completed_at=clock_timestamp(),revision=revision+1 where id=p_id;
 insert into public.meeting_operation_log(meeting_id,actor_id,action,reason,before_state,after_state)
   values(p_id,auth.uid(),p_status,p_reason,to_jsonb(v),jsonb_build_object('status',p_status));
 for a in select * from public.meeting_applications where meeting_id=p_id and status in ('CONFIRMED','WAITLIST','OFFERED') loop
   perform public.enqueue_member_notification(a.user_id,'meeting-closed:'||p_id||':'||a.user_id,'MEETING_CLOSED',
     case when p_status='COMPLETED' then '클럽 모임이 완료되었습니다' else '클럽 모임이 취소되었습니다' end,
     v.title||E'\n'||p_reason,'/meetings/'||p_id);
 end loop;
 perform public.reconcile_meeting_waitlist(p_id);
end;
$$;

create function public.get_club_meeting_board(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.club_meetings; v_manage boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.can_read_club_meeting(p_id) then raise exception 'forbidden'; end if;
 perform public.reconcile_meeting_waitlist(p_id);
 select * into v from public.club_meetings where id=p_id;
 v_manage=public.can_manage_club_meeting(p_id);
 return jsonb_build_object('meeting',to_jsonb(v),'can_manage',v_manage,'eligible',public.eligible_meeting_member(p_id,auth.uid()),
   'club_name',(select name from public.clubs where id=v.club_id),
   'confirmed',(select count(*) from public.meeting_applications where meeting_id=p_id and status='CONFIRMED'),
   'reserved',(select count(*) from public.meeting_applications where meeting_id=p_id and status='OFFERED'),
   'waiting',(select count(*) from public.meeting_applications where meeting_id=p_id and status='WAITLIST'),
   'application',(select to_jsonb(a) from public.meeting_applications a where a.meeting_id=p_id and a.user_id=auth.uid() order by a.queue_number desc limit 1),
   'people',case when v_manage then (select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('name',p.name,'username',p.username) order by a.queue_number),'[]'::jsonb)
     from public.meeting_applications a join public.member_profiles p on p.id=a.user_id where a.meeting_id=p_id) else '[]'::jsonb end);
end;
$$;

create function public.maintain_club_meetings() returns integer
language plpgsql security definer set search_path='' as $$
declare v record; n integer=0;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 for v in select id from public.club_meetings where status='OPEN' or (archived_at is null and completed_at<=clock_timestamp()-interval '24 hours') loop
   perform public.reconcile_meeting_waitlist(v.id); n=n+1;
 end loop;
 return n;
end;
$$;
create function public.guard_club_meeting_archive() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.archived_at is null and new.archived_at is not null and exists(select 1 from public.club_meetings where club_id=new.id and status='OPEN')
   then raise exception 'unresolved_meetings'; end if;
 return new;
end;
$$;
create trigger club_meeting_archive_guard before update of archived_at on public.clubs
for each row execute function public.guard_club_meeting_archive();

revoke all on function public.eligible_meeting_member(uuid,uuid),public.set_meeting_application_status(uuid,text,text),
  public.reconcile_meeting_waitlist(uuid),public.guard_club_meeting_archive() from public,anon,authenticated;
revoke all on function public.can_manage_club_meeting(uuid),public.can_read_club_meeting(uuid),public.save_club_meeting(uuid,integer,jsonb),
  public.apply_club_meeting(uuid),public.respond_meeting_application(uuid,text),public.close_club_meeting(uuid,integer,text,text),
  public.get_club_meeting_board(uuid) from public,anon;
grant execute on function public.can_manage_club_meeting(uuid),public.can_read_club_meeting(uuid),public.save_club_meeting(uuid,integer,jsonb),
  public.apply_club_meeting(uuid),public.respond_meeting_application(uuid,text),public.close_club_meeting(uuid,integer,text,text),
  public.get_club_meeting_board(uuid) to authenticated;
revoke all on function public.maintain_club_meetings() from public,anon,authenticated;
grant execute on function public.maintain_club_meetings() to service_role;
commit;
