-- Versioned poker situations, preserved review context and unified member XP.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create function public.learning_spot_valid(p_spot jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare v_cards jsonb; v_board integer; v_players numeric; v_stack numeric; v_pot numeric;
begin
  if p_spot is null or jsonb_typeof(p_spot) is distinct from 'object' then return false; end if;
  if not (p_spot ?& array['game','category','format','players','stack_bb','hero_position','villain_position','hero_hand','board','pot_bb','action_history'])
    or p_spot - array['game','category','format','players','stack_bb','hero_position','villain_position','hero_hand','board','pot_bb','action_history'] <> '{}'::jsonb
    then return false; end if;
  if p_spot->>'game' is distinct from 'NLHE' or coalesce(p_spot->>'category','') not in ('PREFLOP','FLOP','TURN','RIVER','ICM')
    or coalesce(p_spot->>'format','') not in ('MTT','CASH','SNG') then return false; end if;
  if jsonb_typeof(p_spot->'players') is distinct from 'number' or jsonb_typeof(p_spot->'stack_bb') is distinct from 'number' then return false; end if;
  v_players=(p_spot->>'players')::numeric; v_stack=(p_spot->>'stack_bb')::numeric;
  if v_players<2 or v_players>10 or v_players<>trunc(v_players) or v_stack<=0 or v_stack>10000 then return false; end if;
  if coalesce(p_spot->>'hero_position','') not in ('BTN','SB','BB','UTG','UTG+1','UTG+2','LJ','HJ','CO')
    or (p_spot->'villain_position'<>'null'::jsonb and (
      coalesce(p_spot->>'villain_position','') not in ('BTN','SB','BB','UTG','UTG+1','UTG+2','LJ','HJ','CO')
      or p_spot->>'villain_position'=p_spot->>'hero_position')) then return false; end if;
  if jsonb_typeof(p_spot->'hero_hand') is distinct from 'array' or jsonb_typeof(p_spot->'board') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_spot->'hero_hand')<>2 then return false; end if;
  v_board=jsonb_array_length(p_spot->'board');
  if (p_spot->>'category'='PREFLOP' and v_board<>0) or (p_spot->>'category'='FLOP' and v_board<>3)
    or (p_spot->>'category'='TURN' and v_board<>4) or (p_spot->>'category'='RIVER' and v_board<>5)
    or (p_spot->>'category'='ICM' and v_board not in (0,3,4,5)) then return false; end if;
  v_cards=(p_spot->'hero_hand')||(p_spot->'board');
  if exists(select 1 from jsonb_array_elements_text(v_cards) card where coalesce(card,'')!~'^[2-9TJQKA][cdhs]$')
    or (select count(distinct card) from jsonb_array_elements_text(v_cards) card)<>jsonb_array_length(v_cards) then return false; end if;
  if p_spot->'pot_bb'='null'::jsonb then
    if v_board>0 then return false; end if;
  else
    if jsonb_typeof(p_spot->'pot_bb') is distinct from 'number' then return false; end if;
    v_pot=(p_spot->>'pot_bb')::numeric;
    if v_pot<=0 or v_pot>1000000 then return false; end if;
  end if;
  if jsonb_typeof(p_spot->'action_history') is distinct from 'string'
    or length(btrim(p_spot->>'action_history')) not between 1 and 4000 then return false; end if;
  return true;
exception when numeric_value_out_of_range or invalid_text_representation then return false;
end $$;

-- Existing published questions retain their original free-text context. New GTO
-- versions require a validated spot through save_learning_question below.
alter table public.learning_question_versions add column spot jsonb
  constraint learning_question_spot_valid check(spot is null or public.learning_spot_valid(spot));

create function public.guard_learning_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='DELETE' then raise exception 'immutable_learning_version'; end if;
  if old.status<>'DRAFT' or new.status not in ('PUBLISHED','REJECTED')
    or (to_jsonb(new)-array['status','reviewed_by','reviewed_at']) is distinct from (to_jsonb(old)-array['status','reviewed_by','reviewed_at'])
    or not exists(select 1 from public.learning_reviews r where r.version_id=old.id and r.decision=new.status and r.reviewer_id=new.reviewed_by)
    then raise exception 'immutable_learning_version'; end if;
  return new;
end $$;
create trigger preserve_learning_version before update or delete on public.learning_question_versions
  for each row execute function public.guard_learning_version();

create function public.learning_current_streak(p_user uuid) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare v_today date=(clock_timestamp() at time zone 'Asia/Seoul')::date; v_cursor date; v_first date; v_streak integer=0;
begin
  select min(day) into v_first from public.learning_attempts where user_id=p_user;
  v_cursor=case when exists(select 1 from public.learning_attempts where user_id=p_user and day=v_today) then v_today else v_today-1 end;
  while v_first is not null and v_cursor>=v_first loop
    if exists(select 1 from public.learning_attempts where user_id=p_user and day=v_cursor) then v_streak=v_streak+1;
    elsif not exists(select 1 from public.learning_day_protections where day=v_cursor) then exit; end if;
    v_cursor=v_cursor-1;
  end loop;
  return v_streak;
end $$;


create or replace function public.save_learning_question(p_question uuid,p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_question uuid=p_question; v_id uuid; v_version integer; v_choices jsonb; v_correct text[]; v_mode text; v_kind text; v_gto jsonb; v_spot jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if (p_payload->>'authorship_confirmed')::boolean is distinct from true or nullif(btrim(p_payload->>'authorship_note'),'') is null then raise exception 'original_authorship_required'; end if;
 v_spot=nullif(p_payload->'spot','null'::jsonb);
 if (p_payload->>'kind'='GTO' and v_spot is null) or (v_spot is not null and not public.learning_spot_valid(v_spot)) then raise exception 'invalid_learning_spot'; end if;
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
 insert into public.learning_question_versions(question_id,version,prompt,choices,answer_mode,correct_ids,explanation,difficulty,kind,authorship_note,ai_assisted,gto_evidence,authored_by,spot)
 values(v_question,v_version,btrim(p_payload->>'prompt'),v_choices,v_mode,v_correct,btrim(p_payload->>'explanation'),
   p_payload->>'difficulty',v_kind,btrim(p_payload->>'authorship_note'),coalesce((p_payload->>'ai_assisted')::boolean,false),
   case when v_kind='GTO' then v_gto end,auth.uid(),v_spot) returning id into v_id;
 insert into public.learning_audit_log(actor_id,action,subject_id,details)
   values(auth.uid(),'VERSION_AUTHORED',v_id,jsonb_build_object('question_id',v_question,'version',v_version,'origin','DONUTS_ORIGINAL','ai_assisted',p_payload->'ai_assisted'));
 return v_id;
end;
$$;

create or replace function public.learning_attempt_result(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.learning_attempts; v_answers jsonb;
begin
 select * into v from public.learning_attempts where id=p_id;
 if not found or not (public.is_admin() or (v.user_id=auth.uid() and public.domain_current_member())) then raise exception 'forbidden'; end if;
 select jsonb_agg(jsonb_build_object('version_id',q.id,'question_id',q.question_id,'version',q.version,'prompt',q.prompt,
   'choices',q.choices,'answer_mode',q.answer_mode,'difficulty',q.difficulty,'selected_ids',a.selected_ids,'correct_ids',q.correct_ids,
   'spot',q.spot,'correct',a.correct,'explanation',q.explanation,'gto_evidence',q.gto_evidence) order by served.ordinality)
   into v_answers from public.learning_answers a join public.learning_question_versions q on q.id=a.version_id
   join public.learning_daily_sets d on d.day=v.day
   join lateral unnest(d.version_ids) with ordinality served(id,ordinality) on served.id=q.id
   where a.attempt_id=p_id;
 return jsonb_build_object('id',v.id,'day',v.day,'correct_count',v.correct_count,'xp',case when v.correct_count=5 then 40 else 30 end,'current_streak',public.learning_current_streak(v.user_id),'answers',v_answers);
end;
$$;

create or replace function public.get_daily_learning() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_day date=(clock_timestamp() at time zone 'Asia/Seoul')::date; v public.learning_daily_sets; v_attempt uuid; v_questions jsonb;
begin
 if not public.domain_current_member() then raise exception 'forbidden'; end if;
 select * into v from public.learning_daily_sets where day=v_day;
 if not found then return jsonb_build_object('day',v_day,'available',false,'questions','[]'::jsonb,'result',null); end if;
 select jsonb_agg(jsonb_build_object('id',q.id,'prompt',q.prompt,'choices',q.choices,'answer_mode',q.answer_mode,
   'difficulty',q.difficulty,'kind',q.kind,'spot',q.spot,'assumptions',q.gto_evidence->>'assumptions') order by served.ordinality)
   into v_questions from unnest(v.version_ids) with ordinality served(id,ordinality) join public.learning_question_versions q on q.id=served.id;
 select id into v_attempt from public.learning_attempts where user_id=auth.uid() and day=v_day;
 return jsonb_build_object('day',v_day,'available',true,'questions',v_questions,
   'result',case when v_attempt is not null then public.learning_attempt_result(v_attempt) end);
end;
$$;

create or replace function public.get_my_learning_summary(p_page integer default 1) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_difficulty jsonb; v_wrong jsonb;
begin
 if not public.domain_current_member() then raise exception 'forbidden'; end if;
 select coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) into v_difficulty from (
   select q.difficulty,count(*) total,count(*) filter(where a.correct) correct
   from public.learning_answers a join public.learning_attempts t on t.id=a.attempt_id
   join public.learning_question_versions q on q.id=a.version_id where t.user_id=auth.uid() group by q.difficulty
 ) d;
 select coalesce(jsonb_agg(to_jsonb(w)),'[]'::jsonb) into v_wrong from (
   select t.day,q.id version_id,q.version,q.prompt,q.choices,q.answer_mode,q.difficulty,a.selected_ids,q.correct_ids,q.explanation,q.gto_evidence,q.spot
   from public.learning_answers a join public.learning_attempts t on t.id=a.attempt_id
   join public.learning_question_versions q on q.id=a.version_id where t.user_id=auth.uid() and not a.correct
   order by t.day desc,q.id offset (greatest(coalesce(p_page,1),1)-1)*50 limit 50
 ) w;
 return jsonb_build_object('completed_days',(select count(*) from public.learning_attempts where user_id=auth.uid()),
   'current_streak',public.learning_current_streak(auth.uid()),'total',(select count(*)*5 from public.learning_attempts where user_id=auth.uid()),
   'correct',(select coalesce(sum(correct_count),0) from public.learning_attempts where user_id=auth.uid()),
   'difficulty',v_difficulty,'wrong_answers',v_wrong,
   'wrong_count',(select count(*) from public.learning_answers a join public.learning_attempts t on t.id=a.attempt_id where t.user_id=auth.uid() and not a.correct));
end;
$$;

create or replace function public.get_my_class_activity() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare total bigint; weekly bigint; level_value bigint; attendance jsonb; ledger jsonb;
begin
  if auth.uid() is null or not (public.is_active_member() or public.is_admin()) then raise exception 'forbidden'; end if;
  select coalesce(sum(delta), 0) into total from public.xp_ledger where user_id = auth.uid();
  select coalesce(sum(delta),0) into weekly from public.xp_ledger where user_id=auth.uid()
    and created_at >= (date_trunc('week', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')
    and created_at < ((date_trunc('week', now() at time zone 'Asia/Seoul') + interval '7 days') at time zone 'Asia/Seoul');
  level_value := floor((1 + sqrt(1 + total::numeric * 0.08)) / 2)::bigint;
  select coalesce(jsonb_agg(to_jsonb(rows) order by scheduled_at desc), '[]'::jsonb) into attendance from (
    select s.id as session_id, c.id as class_id, c.name as class_name, s.session_number, s.scheduled_at,
      s.status, s.cancelled_at, s.attendance_locked, a.mark
    from public.class_attendance a join public.class_sessions s on s.id = a.session_id and s.roster_run = a.roster_run
      join public.classes c on c.id = s.class_id
    where a.user_id = auth.uid() and s.status <> 'SCHEDULED' order by s.scheduled_at desc limit 50
  ) rows;
  select coalesce(jsonb_agg(to_jsonb(rows) order by created_at desc, id desc), '[]'::jsonb) into ledger from (
    select x.id, x.delta, x.reason, x.created_at, c.name as class_name, s.session_number, x.source_kind, t.day as learning_day
    from public.xp_ledger x left join public.class_sessions s on s.id = x.session_id left join public.classes c on c.id = s.class_id
      left join public.learning_attempts t on t.id = x.learning_attempt_id
    where x.user_id = auth.uid() order by x.created_at desc, x.id desc limit 50
  ) rows;
  return jsonb_build_object('total_xp', total, 'weekly_xp', weekly, 'level', level_value,
    'level_start_xp', 50 * level_value * (level_value - 1), 'next_level_xp', 50 * level_value * (level_value + 1),
    'attendance', attendance, 'ledger', ledger);
end $$;

revoke all on function public.learning_spot_valid(jsonb), public.guard_learning_version(), public.learning_current_streak(uuid)
  from public, anon, authenticated;
-- CREATE OR REPLACE preserves existing RPC grants and their authorization checks.
commit;
