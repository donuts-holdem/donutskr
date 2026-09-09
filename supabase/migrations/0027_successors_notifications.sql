-- Successor affiliation and durable notifications. Applied predecessors are immutable.
begin;

create function public.domain_member_active(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.member_profiles p join auth.users u on u.id=p.id
    where p.id=p_user and p.status='ACTIVE' and u.email_confirmed_at is not null);
$$;
create function public.domain_current_member() returns boolean
language sql stable security definer set search_path='' as $$
  select public.is_admin() or public.domain_member_active(auth.uid());
$$;
revoke all on function public.domain_member_active(uuid) from public,anon,authenticated;
revoke all on function public.domain_current_member() from public,anon;
grant execute on function public.domain_current_member() to authenticated;

create table public.member_notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_profiles(id),
  event_key text not null unique,
  kind text not null,
  title text not null,
  body text not null,
  path text not null check(path ~ '^/[a-z]' and path !~ '[\\]'),
  expires_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index member_notifications_user_idx on public.member_notifications(user_id,created_at desc,id);
create table public.notification_emails(
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.member_notifications(id),
  recipient text not null,
  status text not null default 'PENDING' check(status in ('PENDING','PROCESSING','SENT','FAILED','CANCELLED')),
  payload jsonb,
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  available_at timestamptz not null default clock_timestamp(),
  lease_id uuid,
  leased_until timestamptz,
  provider_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index notification_emails_queue_idx on public.notification_emails(status,available_at);
create table public.class_successions(
  id uuid primary key default gen_random_uuid(),
  predecessor_id uuid not null references public.classes(id),
  successor_id uuid not null unique references public.classes(id),
  closure_id uuid not null references public.class_closures(id),
  mode text not null default 'INVITE' check(mode in ('INVITE','AUTO_ENROLL')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default clock_timestamp(),
  executed_at timestamptz,
  executed_by uuid references auth.users(id),
  execution_snapshot jsonb,
  check(predecessor_id<>successor_id)
);
alter table public.member_notifications enable row level security;
alter table public.notification_emails enable row level security;
alter table public.class_successions enable row level security;
revoke all on public.member_notifications,public.notification_emails,public.class_successions from anon,authenticated;
grant select on public.member_notifications,public.notification_emails,public.class_successions to authenticated;
create policy notifications_read on public.member_notifications for select to authenticated
using(public.is_admin() or (user_id=auth.uid() and public.domain_current_member()));
create policy emails_admin_read on public.notification_emails for select to authenticated using(public.is_admin());
create policy successions_read on public.class_successions for select to authenticated
using(public.is_admin() or public.can_review_affiliation('CLASS',predecessor_id) or public.can_review_affiliation('CLASS',successor_id));

create function public.enqueue_member_notification(p_user uuid,p_key text,p_kind text,p_title text,p_body text,p_path text,p_expires timestamptz default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_email text;
begin
  if not public.domain_member_active(p_user) then return null; end if;
  insert into public.member_notifications(user_id,event_key,kind,title,body,path,expires_at)
  values(p_user,p_key,p_kind,p_title,p_body,p_path,p_expires)
  on conflict(event_key) do nothing returning id into v_id;
  if v_id is null then select id into v_id from public.member_notifications where event_key=p_key; return v_id; end if;
  select email into v_email from auth.users where id=p_user and email_confirmed_at is not null;
  if v_email is not null then insert into public.notification_emails(notification_id,recipient) values(v_id,v_email); end if;
  return v_id;
end;
$$;

create function public.create_class_succession(p_predecessor uuid,p_successor uuid,p_mode text default 'INVITE') returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_closure uuid; v_cycle boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_mode is null or p_mode not in ('INVITE','AUTO_ENROLL') or p_predecessor=p_successor then raise exception 'invalid_succession'; end if;
  if not exists(select 1 from public.classes where id=p_predecessor and closed_at is not null)
    or not exists(select 1 from public.classes where id=p_successor and active and closed_at is null and archived_at is null and first_started_at is null)
    then raise exception 'invalid_succession'; end if;
  with recursive ancestors(id) as (
    select p_predecessor union select s.predecessor_id from public.class_successions s join ancestors a on s.successor_id=a.id
  ) select exists(select 1 from ancestors where id=p_successor) into v_cycle;
  if v_cycle then raise exception 'invalid_succession'; end if;
  select id into v_closure from public.class_closures where class_id=p_predecessor order by closed_at desc,id limit 1;
  if v_closure is null then raise exception 'invalid_succession'; end if;
  insert into public.class_successions(predecessor_id,successor_id,closure_id,mode,created_by)
    values(p_predecessor,p_successor,v_closure,p_mode,auth.uid()) returning id into v_id;
  perform public.record_entity_operation('CLASS',p_successor,'SUCCESSOR_LINKED',null,null,
    jsonb_build_object('succession_id',v_id,'predecessor_id',p_predecessor,'closure_id',v_closure,'mode',p_mode));
  return v_id;
end;
$$;

create function public.preview_class_succession(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.class_successions; v_members jsonb; v_snapshot jsonb; v_target public.classes;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into v from public.class_successions where id=p_id;
  if not found then raise exception 'invalid_succession'; end if;
  select * into v_target from public.classes where id=v.successor_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'username',p.username) order by p.id),'[]'::jsonb)
    into v_members from public.class_closure_members cm
    join public.member_profiles p on p.id=cm.user_id
    join public.class_memberships m on m.user_id=p.id and m.class_id=v.predecessor_id and m.active
    where cm.closure_id=v.closure_id and public.domain_member_active(p.id)
      and not exists(select 1 from public.class_memberships target where target.class_id=v.successor_id and target.user_id=p.id and target.active);
  v_snapshot=jsonb_build_object('id',v.id,'mode',v.mode,'successor_id',v.successor_id,
    'successor_revision',v_target.revision,'members',v_members,'executed_at',v.executed_at,
    'excluded_count',(select count(*) from public.class_closure_members where closure_id=v.closure_id)-jsonb_array_length(v_members));
  return v_snapshot||jsonb_build_object('fingerprint',md5(v_snapshot::text));
end;
$$;

create function public.execute_class_succession(p_id uuid,p_fingerprint text,p_confirm boolean,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.class_successions; v_preview jsonb; v_member jsonb; v_user uuid; v_name text; v_request uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_confirm is distinct from true or nullif(btrim(p_reason),'') is null or length(p_reason)>500 then raise exception 'confirmation_required'; end if;
  select * into v from public.class_successions where id=p_id for update;
  if not found then raise exception 'invalid_succession'; end if;
  if v.executed_at is not null then return v.execution_snapshot; end if;
  select name into v_name from public.classes where id=v.successor_id and active and closed_at is null and archived_at is null and first_started_at is null;
  if not found then raise exception 'invalid_succession'; end if;
  v_preview=public.preview_class_succession(p_id);
  if (v_preview->>'fingerprint') is distinct from p_fingerprint then raise exception 'stale_preview'; end if;
  for v_member in select value from jsonb_array_elements(v_preview->'members') loop
    v_user=(v_member->>'id')::uuid;
    if v.mode='AUTO_ENROLL' then
      select id into v_request from public.affiliation_requests where user_id=v_user and kind='CLASS' and class_id=v.successor_id and status='PENDING';
      if v_request is not null then
        update public.affiliation_requests set status='APPROVED',decided_by=auth.uid(),decided_at=clock_timestamp(),decision_reason=p_reason where id=v_request;
      else
        insert into public.affiliation_requests(user_id,kind,class_id,status,decided_by,decided_at,decision_reason)
          values(v_user,'CLASS',v.successor_id,'APPROVED',auth.uid(),clock_timestamp(),p_reason);
      end if;
      insert into public.class_memberships(class_id,user_id) values(v.successor_id,v_user)
        on conflict(class_id,user_id) do update set active=true;
    end if;
    perform public.enqueue_member_notification(v_user,'successor:'||v.id||':'||v_user,'CLASS_SUCCESSOR',
      case when v.mode='AUTO_ENROLL' then '후속 클래스에 소속되었습니다' else '다음 클래스를 만나보세요' end,
      v_name||case when v.mode='AUTO_ENROLL' then ' 클래스 소속이 완료되었습니다. 일정을 확인해 주세요.' else ' 클래스가 열렸습니다. 참여하려면 클래스 페이지에서 신청해 주세요.' end,
      '/class/'||v.successor_id);
  end loop;
  update public.class_successions set executed_at=clock_timestamp(),executed_by=auth.uid(),execution_snapshot=v_preview where id=p_id;
  perform public.record_entity_operation('CLASS',v.successor_id,'SUCCESSOR_EXECUTED',p_reason,null,v_preview);
  return v_preview;
end;
$$;

create function public.mark_notification_read(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.domain_current_member() then raise exception 'forbidden'; end if;
  update public.member_notifications set read_at=coalesce(read_at,clock_timestamp()) where id=p_id and user_id=auth.uid();
end;
$$;

-- Service-only leased queue; immutable provider payload and a bounded dedupe window.
create function public.claim_notification_emails(p_sender text,p_origin text,p_limit integer default 10) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_job record; v_items jsonb='[]'::jsonb; v_lease uuid; v_payload jsonb;
begin
  if nullif(btrim(p_sender),'') is null or p_origin !~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?$' then raise exception 'invalid_email_configuration'; end if;
  for v_job in
    select e.*,n.user_id,n.title,n.body,n.path,n.expires_at from public.notification_emails e
    join public.member_notifications n on n.id=e.notification_id
    where (e.status='PENDING' and e.available_at<=clock_timestamp())
       or (e.status='PROCESSING' and e.leased_until<=clock_timestamp())
    order by e.created_at,e.id for update of e skip locked limit least(greatest(p_limit,1),25)
  loop
    if not public.domain_member_active(v_job.user_id) or (v_job.expires_at is not null and v_job.expires_at<=clock_timestamp()) then
      update public.notification_emails set status='CANCELLED',lease_id=null,leased_until=null,last_error='recipient_ineligible_or_notification_expired' where id=v_job.id;
      continue;
    end if;
    if v_job.attempts>=10 or v_job.first_attempt_at<clock_timestamp()-interval '23 hours' then
      update public.notification_emails set status='FAILED',lease_id=null,leased_until=null,last_error='automatic_retry_window_exceeded' where id=v_job.id;
      continue;
    end if;
    v_lease=gen_random_uuid();
    v_payload=coalesce(v_job.payload,jsonb_build_object('from',p_sender,'to',jsonb_build_array(v_job.recipient),'subject',v_job.title,'text',v_job.body||E'\n\n'||p_origin||v_job.path));
    update public.notification_emails set status='PROCESSING',payload=v_payload,attempts=attempts+1,
      first_attempt_at=coalesce(first_attempt_at,clock_timestamp()),lease_id=v_lease,leased_until=clock_timestamp()+interval '5 minutes' where id=v_job.id;
    v_items=v_items||jsonb_build_array(jsonb_build_object('id',v_job.id,'lease_id',v_lease,'payload',v_payload));
  end loop;
  return v_items;
end;
$$;

create function public.finish_notification_email(p_id uuid,p_lease uuid,p_provider_id text,p_error text,p_retryable boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.notification_emails set
    status=case when p_provider_id is not null then 'SENT' when p_retryable then 'PENDING' else 'FAILED' end,
    provider_id=p_provider_id,last_error=left(p_error,500),
    sent_at=case when p_provider_id is not null then clock_timestamp() else null end,
    available_at=clock_timestamp()+make_interval(secs=>least(3600,60*power(2,least(attempts,6)))::integer),
    lease_id=null,leased_until=null
    where id=p_id and status='PROCESSING' and lease_id=p_lease;
  if not found then raise exception 'stale_email_lease'; end if;
end;
$$;

revoke all on function public.enqueue_member_notification(uuid,text,text,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.create_class_succession(uuid,uuid,text),public.preview_class_succession(uuid),
  public.execute_class_succession(uuid,text,boolean,text),public.mark_notification_read(uuid) from public,anon;
grant execute on function public.create_class_succession(uuid,uuid,text),public.preview_class_succession(uuid),
  public.execute_class_succession(uuid,text,boolean,text),public.mark_notification_read(uuid) to authenticated;
revoke all on function public.claim_notification_emails(text,text,integer),public.finish_notification_email(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_notification_emails(text,text,integer),public.finish_notification_email(uuid,uuid,text,text,boolean) to service_role;
commit;
