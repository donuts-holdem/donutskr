-- Reviewed original questions, immutable daily sets and database-side grading.
begin;
create table public.learning_questions(
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default clock_timestamp()
);
create table public.learning_question_versions(
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.learning_questions(id),
  version integer not null check(version>0),
  prompt text not null check(length(btrim(prompt)) between 1 and 10000),
  choices jsonb not null check(jsonb_typeof(choices)='array' and jsonb_array_length(choices)>=2),
  answer_mode text not null check(answer_mode in ('SINGLE','MULTIPLE')),
  correct_ids text[] not null,
  explanation text not null check(length(btrim(explanation)) between 1 and 12000),
  difficulty text not null check(difficulty in ('BEGINNER','INTERMEDIATE','ADVANCED')),
  kind text not null check(kind in ('GENERAL','GTO')),
  origin text not null default 'DONUTS_ORIGINAL' check(origin='DONUTS_ORIGINAL'),
  authorship_note text not null,
  ai_assisted boolean not null default false,
  gto_evidence jsonb,
  status text not null default 'DRAFT' check(status in ('DRAFT','PUBLISHED','REJECTED')),
  authored_by uuid not null references auth.users(id),
  created_at timestamptz not null default clock_timestamp(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  unique(question_id,version),
  check((answer_mode='SINGLE' and cardinality(correct_ids)=1) or (answer_mode='MULTIPLE' and cardinality(correct_ids)>1)),
  check((status='DRAFT')=(reviewed_at is null and reviewed_by is null))
);
create table public.learning_reviews(
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null unique references public.learning_question_versions(id),
  reviewer_id uuid not null references auth.users(id),
  decision text not null check(decision in ('PUBLISHED','REJECTED')),
  checks jsonb not null,
  notes text not null,
  created_at timestamptz not null default clock_timestamp()
);
create table public.learning_daily_sets(
  day date primary key,
  version_ids uuid[] not null check(cardinality(version_ids)=5),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default clock_timestamp()
);
create table public.learning_attempts(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_profiles(id),
  day date not null references public.learning_daily_sets(day),
  correct_count integer not null check(correct_count between 0 and 5),
  submitted_at timestamptz not null default clock_timestamp(),
  unique(user_id,day),
  unique(id,user_id)
);
create table public.learning_answers(
  attempt_id uuid not null references public.learning_attempts(id),
  version_id uuid not null references public.learning_question_versions(id),
  selected_ids text[] not null,
  correct boolean not null,
  primary key(attempt_id,version_id)
);
create table public.learning_day_protections(
  day date primary key,
  reason text not null,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default clock_timestamp()
);
create table public.learning_audit_log(
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  action text not null,
  subject_id uuid,
  details jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.learning_questions enable row level security;
alter table public.learning_question_versions enable row level security;
alter table public.learning_reviews enable row level security;
alter table public.learning_daily_sets enable row level security;
alter table public.learning_attempts enable row level security;
alter table public.learning_answers enable row level security;
alter table public.learning_day_protections enable row level security;
alter table public.learning_audit_log enable row level security;
revoke all on public.learning_questions,public.learning_question_versions,public.learning_reviews,public.learning_daily_sets,
  public.learning_attempts,public.learning_answers,public.learning_day_protections,public.learning_audit_log from anon,authenticated;
grant select on public.learning_questions,public.learning_question_versions,public.learning_reviews,public.learning_daily_sets,
  public.learning_attempts,public.learning_answers,public.learning_day_protections,public.learning_audit_log to authenticated;
create policy questions_admin on public.learning_questions for select to authenticated using(public.is_admin());
create policy versions_admin on public.learning_question_versions for select to authenticated using(public.is_admin());
create policy reviews_admin on public.learning_reviews for select to authenticated using(public.is_admin());
create policy daily_sets_admin on public.learning_daily_sets for select to authenticated using(public.is_admin());
create policy learning_audit_admin on public.learning_audit_log for select to authenticated using(public.is_admin());
create policy protections_read on public.learning_day_protections for select to authenticated using(public.domain_current_member());
create policy attempts_read on public.learning_attempts for select to authenticated
  using(public.is_admin() or (user_id=auth.uid() and public.domain_current_member()));
create policy answers_read on public.learning_answers for select to authenticated using(public.is_admin() or (
  public.domain_current_member() and exists(select 1 from public.learning_attempts a where a.id=attempt_id and a.user_id=auth.uid())));

alter table public.xp_ledger add column learning_attempt_id uuid;
alter table public.xp_ledger add constraint xp_learning_attempt_member_fkey
  foreign key(learning_attempt_id,user_id) references public.learning_attempts(id,user_id);
alter table public.xp_ledger alter column session_id drop not null;
alter table public.xp_ledger alter column operation_id drop not null;
alter table public.xp_ledger drop constraint xp_ledger_source_kind_check;
alter table public.xp_ledger drop constraint xp_ledger_delta_check;
alter table public.xp_ledger add constraint xp_ledger_domain_source_check check(
 (source_kind='CLASS_ATTENDANCE' and session_id is not null and operation_id is not null and learning_attempt_id is null and delta in (-100,100))
 or (source_kind='DAILY_LEARNING' and session_id is null and operation_id is null and learning_attempt_id is not null and delta in (30,10)));
create unique index xp_learning_once on public.xp_ledger(user_id,learning_attempt_id,delta) where source_kind='DAILY_LEARNING';

create function public.save_learning_question(p_question uuid,p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_question uuid=p_question; v_id uuid; v_version integer; v_choices jsonb; v_correct text[]; v_mode text; v_kind text; v_gto jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if (p_payload->>'authorship_confirmed')::boolean is distinct from true or nullif(btrim(p_payload->>'authorship_note'),'') is null then raise exception 'original_authorship_required'; end if;
 v_choices=p_payload->'choices';v_mode=p_payload->>'answer_mode';v_kind=p_payload->>'kind';v_gto=p_payload->'gto_evidence';
 if jsonb_typeof(v_choices) is distinct from 'array' or jsonb_array_length(v_choices)<2 then raise exception 'invalid_question'; end if;
 if exists(select 1 from jsonb_array_elements(v_choices) c where jsonb_typeof(c)<>'object'
   or coalesce(c->>'id','')!~'^[a-zA-Z0-9_-]{1,40}$' or nullif(btrim(c->>'text'),'') is null)
   or (select count(distinct c->>'id') from jsonb_array_elements(v_choices)c)<>jsonb_array_length(v_choices) then raise exception 'invalid_question'; end if;
 if jsonb_typeof(p_payload->'correct_ids') is distinct from 'array' then raise exception 'invalid_question'; end if;
 select array_agg(x order by x) into v_correct from jsonb_array_elements_text(p_payload->'correct_ids') x;
 if v_correct is null or cardinality(v_correct)<>(select count(distinct x) from unnest(v_correct)x)
   or exists(select 1 from unnest(v_correct)x where not exists(select 1 from jsonb_array_elements(v_choices)c where c->>'id'=x))
   then raise exception 'invalid_question'; end if;
 if v_mode is null or v_mode not in ('SINGLE','MULTIPLE') or (v_mode='SINGLE' and cardinality(v_correct)<>1)
   or (v_mode='MULTIPLE' and cardinality(v_correct)<2) then raise exception 'invalid_answer_mode'; end if;
 if v_kind='GTO' and (jsonb_typeof(v_gto) is distinct from 'object'
   or nullif(btrim(v_gto->>'solver'),'') is null or nullif(btrim(v_gto->>'assumptions'),'') is null
   or nullif(btrim(v_gto->>'evidence'),'') is null or nullif(btrim(v_gto->>'frequencies'),'') is null)
   then raise exception 'gto_evidence_required'; end if;
 if v_question is null then
   insert into public.learning_questions(created_by) values(auth.uid()) returning id into v_question;
 elsif not exists(select 1 from public.learning_questions where id=v_question) then raise exception 'invalid_question'; end if;
 select coalesce(max(version),0)+1 into v_version from public.learning_question_versions where question_id=v_question;
 insert into public.learning_question_versions(question_id,version,prompt,choices,answer_mode,correct_ids,explanation,difficulty,kind,authorship_note,ai_assisted,gto_evidence,authored_by)
 values(v_question,v_version,btrim(p_payload->>'prompt'),v_choices,v_mode,v_correct,btrim(p_payload->>'explanation'),
   p_payload->>'difficulty',v_kind,btrim(p_payload->>'authorship_note'),coalesce((p_payload->>'ai_assisted')::boolean,false),
   case when v_kind='GTO' then v_gto end,auth.uid()) returning id into v_id;
 insert into public.learning_audit_log(actor_id,action,subject_id,details)
   values(auth.uid(),'VERSION_AUTHORED',v_id,jsonb_build_object('question_id',v_question,'version',v_version,'origin','DONUTS_ORIGINAL','ai_assisted',p_payload->'ai_assisted'));
 return v_id;
end;
$$;

create function public.review_learning_question(p_version uuid,p_publish boolean,p_checks jsonb,p_notes text) returns void
language plpgsql security definer set search_path='' as $$
declare v public.learning_question_versions; v_status text;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.is_admin() then raise exception 'forbidden'; end if;
 select * into v from public.learning_question_versions where id=p_version for update;
 if not found or v.status<>'DRAFT' then raise exception 'already_reviewed'; end if;
 if p_publish is null or nullif(btrim(p_notes),'') is null or length(p_notes)>4000 then raise exception 'review_required'; end if;
 if p_publish and ((p_checks->>'original')::boolean is distinct from true or (p_checks->>'answer')::boolean is distinct from true
   or (p_checks->>'explanation')::boolean is distinct from true
   or (v.kind='GTO' and (p_checks->>'gto')::boolean is distinct from true)) then raise exception 'review_required'; end if;
 v_status=case when p_publish then 'PUBLISHED' else 'REJECTED' end;
 insert into public.learning_reviews(version_id,reviewer_id,decision,checks,notes) values(p_version,auth.uid(),v_status,coalesce(p_checks,'{}'),p_notes);
 update public.learning_question_versions set status=v_status,reviewed_by=auth.uid(),reviewed_at=clock_timestamp() where id=p_version;
 insert into public.learning_audit_log(actor_id,action,subject_id,details)
   values(auth.uid(),'VERSION_REVIEWED',p_version,jsonb_build_object('status',v_status,'checks',p_checks,'notes',p_notes));
end;
$$;

create function public.schedule_daily_learning(p_day date,p_versions uuid[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if p_day is null or p_day<(clock_timestamp() at time zone 'Asia/Seoul')::date or cardinality(p_versions) is distinct from 5 then raise exception 'invalid_daily_set'; end if;
 if (select count(distinct question_id) from public.learning_question_versions where id=any(p_versions) and status='PUBLISHED')<>5
   then raise exception 'reviewed_five_required'; end if;
 insert into public.learning_daily_sets(day,version_ids,created_by) values(p_day,p_versions,auth.uid());
 insert into public.learning_audit_log(actor_id,action,details)
   values(auth.uid(),'DAILY_SET_SCHEDULED',jsonb_build_object('day',p_day,'versions',p_versions));
end;
$$;

create function public.learning_attempt_result(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.learning_attempts; v_answers jsonb;
begin
 select * into v from public.learning_attempts where id=p_id;
 if not found or not (public.is_admin() or (v.user_id=auth.uid() and public.domain_current_member())) then raise exception 'forbidden'; end if;
 select jsonb_agg(jsonb_build_object('version_id',q.id,'question_id',q.question_id,'version',q.version,'prompt',q.prompt,
   'choices',q.choices,'answer_mode',q.answer_mode,'difficulty',q.difficulty,'selected_ids',a.selected_ids,'correct_ids',q.correct_ids,
   'correct',a.correct,'explanation',q.explanation,'gto_evidence',q.gto_evidence) order by served.ordinality)
   into v_answers from public.learning_answers a join public.learning_question_versions q on q.id=a.version_id
   join public.learning_daily_sets d on d.day=v.day
   join lateral unnest(d.version_ids) with ordinality served(id,ordinality) on served.id=q.id
   where a.attempt_id=p_id;
 return jsonb_build_object('id',v.id,'day',v.day,'correct_count',v.correct_count,'xp',case when v.correct_count=5 then 40 else 30 end,'answers',v_answers);
end;
$$;

create function public.get_daily_learning() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_day date=(clock_timestamp() at time zone 'Asia/Seoul')::date; v public.learning_daily_sets; v_attempt uuid; v_questions jsonb;
begin
 if not public.domain_current_member() then raise exception 'forbidden'; end if;
 select * into v from public.learning_daily_sets where day=v_day;
 if not found then return jsonb_build_object('day',v_day,'available',false,'questions','[]'::jsonb,'result',null); end if;
 select jsonb_agg(jsonb_build_object('id',q.id,'prompt',q.prompt,'choices',q.choices,'answer_mode',q.answer_mode,
   'difficulty',q.difficulty,'kind',q.kind,'assumptions',q.gto_evidence->>'assumptions') order by served.ordinality)
   into v_questions from unnest(v.version_ids) with ordinality served(id,ordinality) join public.learning_question_versions q on q.id=served.id;
 select id into v_attempt from public.learning_attempts where user_id=auth.uid() and day=v_day;
 return jsonb_build_object('day',v_day,'available',true,'questions',v_questions,
   'result',case when v_attempt is not null then public.learning_attempt_result(v_attempt) end);
end;
$$;

create function public.submit_daily_learning(p_day date,p_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.learning_daily_sets; q public.learning_question_versions; v_id uuid; v_selected text[]; v_correct boolean; n integer=0; v_version uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.domain_member_active(auth.uid()) then raise exception 'member_status_blocked'; end if;
 if p_day is distinct from (clock_timestamp() at time zone 'Asia/Seoul')::date then raise exception 'learning_day_changed'; end if;
 select id into v_id from public.learning_attempts where user_id=auth.uid() and day=p_day;
 if v_id is not null then return public.learning_attempt_result(v_id); end if;
 select * into v from public.learning_daily_sets where day=p_day;
 if not found then raise exception 'learning_unavailable'; end if;
 if jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'answer_all_five'; end if;
 if (select count(*) from jsonb_object_keys(p_answers))<>5
   or exists(select 1 from jsonb_object_keys(p_answers) k where not(k=any(v.version_ids::text[]))) then raise exception 'answer_all_five'; end if;
 insert into public.learning_attempts(user_id,day,correct_count) values(auth.uid(),p_day,0) returning id into v_id;
 foreach v_version in array v.version_ids loop
   select * into q from public.learning_question_versions where id=v_version;
   if jsonb_typeof(p_answers->v_version::text) is distinct from 'array' then raise exception 'answer_all_five'; end if;
   select array_agg(x order by x) into v_selected from jsonb_array_elements_text(p_answers->v_version::text) x;
   if coalesce(cardinality(v_selected),0)=0 or cardinality(v_selected)<>(select count(distinct x) from unnest(v_selected)x)
     or (q.answer_mode='SINGLE' and cardinality(v_selected)<>1)
     or exists(select 1 from unnest(v_selected)x where not exists(select 1 from jsonb_array_elements(q.choices)c where c->>'id'=x))
     then raise exception 'invalid_answer_selection'; end if;
   v_correct=v_selected=q.correct_ids;
   insert into public.learning_answers(attempt_id,version_id,selected_ids,correct) values(v_id,v_version,v_selected,v_correct);
   if v_correct then n=n+1; end if;
 end loop;
 update public.learning_attempts set correct_count=n where id=v_id;
 insert into public.xp_ledger(user_id,source_kind,learning_attempt_id,delta,actor_id,reason)
   values(auth.uid(),'DAILY_LEARNING',v_id,30,auth.uid(),'Daily five-question completion');
 if n=5 then
   insert into public.xp_ledger(user_id,source_kind,learning_attempt_id,delta,actor_id,reason)
     values(auth.uid(),'DAILY_LEARNING',v_id,10,auth.uid(),'All correct on first graded submission');
 end if;
 insert into public.learning_audit_log(actor_id,action,subject_id,details)
   values(auth.uid(),'DAILY_LEARNING_COMPLETED',v_id,jsonb_build_object('day',p_day,'correct_count',n,'xp',case when n=5 then 40 else 30 end));
 return public.learning_attempt_result(v_id);
end;
$$;

create function public.protect_learning_day(p_day date,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if p_day is null or p_day>(clock_timestamp() at time zone 'Asia/Seoul')::date or nullif(btrim(p_reason),'') is null or length(p_reason)>1000 then raise exception 'reason_required'; end if;
 select to_jsonb(p) into v_before from public.learning_day_protections p where day=p_day;
 insert into public.learning_day_protections(day,reason,actor_id) values(p_day,p_reason,auth.uid())
   on conflict(day) do update set reason=p_reason,actor_id=auth.uid(),created_at=clock_timestamp();
 insert into public.learning_audit_log(actor_id,action,details)
   values(auth.uid(),'LEARNING_DAY_PROTECTED',jsonb_build_object('day',p_day,'reason',p_reason,'before',v_before));
end;
$$;

create function public.get_my_learning_summary(p_page integer default 1) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_today date=(clock_timestamp() at time zone 'Asia/Seoul')::date; v_cursor date; v_first date; v_streak integer=0; v_difficulty jsonb; v_wrong jsonb;
begin
 if not public.domain_current_member() then raise exception 'forbidden'; end if;
 select min(day) into v_first from public.learning_attempts where user_id=auth.uid();
 v_cursor=case when exists(select 1 from public.learning_attempts where user_id=auth.uid() and day=v_today) then v_today else v_today-1 end;
 while v_first is not null and v_cursor>=v_first loop
   if exists(select 1 from public.learning_attempts where user_id=auth.uid() and day=v_cursor) then v_streak=v_streak+1;
   elsif not exists(select 1 from public.learning_day_protections where day=v_cursor) then exit; end if;
   v_cursor=v_cursor-1;
 end loop;
 select coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) into v_difficulty from (
   select q.difficulty,count(*) total,count(*) filter(where a.correct) correct
   from public.learning_answers a join public.learning_attempts t on t.id=a.attempt_id
   join public.learning_question_versions q on q.id=a.version_id where t.user_id=auth.uid() group by q.difficulty
 ) d;
 select coalesce(jsonb_agg(to_jsonb(w)),'[]'::jsonb) into v_wrong from (
   select t.day,q.id version_id,q.version,q.prompt,q.choices,q.answer_mode,q.difficulty,a.selected_ids,q.correct_ids,q.explanation,q.gto_evidence
   from public.learning_answers a join public.learning_attempts t on t.id=a.attempt_id
   join public.learning_question_versions q on q.id=a.version_id where t.user_id=auth.uid() and not a.correct
   order by t.day desc,q.id offset (greatest(coalesce(p_page,1),1)-1)*50 limit 50
 ) w;
 return jsonb_build_object('completed_days',(select count(*) from public.learning_attempts where user_id=auth.uid()),
   'current_streak',v_streak,'total',(select count(*)*5 from public.learning_attempts where user_id=auth.uid()),
   'correct',(select coalesce(sum(correct_count),0) from public.learning_attempts where user_id=auth.uid()),
   'difficulty',v_difficulty,'wrong_answers',v_wrong,
   'wrong_count',(select count(*) from public.learning_answers a join public.learning_attempts t on t.id=a.attempt_id where t.user_id=auth.uid() and not a.correct));
end;
$$;

revoke all on function public.save_learning_question(uuid,jsonb),public.review_learning_question(uuid,boolean,jsonb,text),
 public.schedule_daily_learning(date,uuid[]),public.learning_attempt_result(uuid),public.get_daily_learning(),
 public.submit_daily_learning(date,jsonb),public.protect_learning_day(date,text),public.get_my_learning_summary(integer) from public,anon;
grant execute on function public.save_learning_question(uuid,jsonb),public.review_learning_question(uuid,boolean,jsonb,text),
 public.schedule_daily_learning(date,uuid[]),public.learning_attempt_result(uuid),public.get_daily_learning(),
 public.submit_daily_learning(date,jsonb),public.protect_learning_day(date,text),public.get_my_learning_summary(integer) to authenticated;
commit;
