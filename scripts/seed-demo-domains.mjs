import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const TAG = "donuts-demo-domains-v1";
const PREFIX = "[TEST]";
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes("--apply") || !args.includes("--project") || !args.includes("--admin-email")) {
  throw new Error("Usage: node scripts/seed-demo-domains.mjs --apply --project PROJECT_REF --admin-email EXISTING_ADMIN_EMAIL");
}
const env = {};
for (const line of readFileSync(resolve(".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
}
const project = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (project !== option("--project")) throw new Error("The explicit project must match .env.local.");
if (!env.SUPABASE_ACCESS_TOKEN || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server-side Supabase credentials are required.");
const adminEmail = option("--admin-email").trim().toLowerCase();
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
const json = value => literal(JSON.stringify(value)) + "::jsonb";
const root = join(homedir(), "donuts-test-data", TAG + "-" + new Date().toISOString().replaceAll(":", "-"));
mkdirSync(root, { recursive: true, mode: 0o700 });
const privateFile = (name, data) => writeFileSync(join(root, name), typeof data === "string" ? data : JSON.stringify(data, null, 2), { mode: 0o600 });
const report = { tag: TAG, project, status: "PREPARING", createdAt: new Date().toISOString(), accounts: [], data: null };
const persist = () => privateFile("manifest.json", report);

async function database(query, readOnly = false) {
  const response = await fetch("https://api.supabase.com/v1/projects/" + project + "/database/query", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.SUPABASE_ACCESS_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: readOnly }),
    signal: AbortSignal.timeout(readOnly ? 20000 : 60000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error("Database request failed (" + response.status + "): " + String(result.message ?? result.error ?? "Unknown database error").slice(0,1000));
  return result;
}

const roles = [
  ["classlead", "demo_classlead", "테스트 클래스장", "A", "클래스 5개와 두 번째 클럽 담당"],
  ["clublead", "demo_clublead", "테스트 클럽장", "B", "첫 번째 클럽과 그 모임 담당"],
  ["member", "demo_member", "테스트 일반회원", "A", "복수 소속, 신규 신청, 오늘의 학습"],
  ["waitlist", "demo_waitlist", "테스트 대기회원", "B", "대기열과 자리 확정"],
  ["applicant", "demo_applicant", "테스트 신청회원", "B", "소속 승인 대기와 게스트 참여"],
  ["history", "demo_history", "테스트 기록회원", "A", "출석, XP, 지난 모임, 오답 기록"],
].map(([key, username, name, school, purpose]) => ({
  key, username, name: PREFIX + " " + name, school, purpose,
  email: username + "@donuts-demo.invalid",
  password: randomBytes(20).toString("base64url") + "!aA7",
}));

const originalNote = "[TEST] 기능 테스트를 위해 새로 작성한 DO:NUTS 예시입니다. 외부 문제은행 미사용, AI 도구 작성 보조. 정식 운영 출제 전 사람의 재검수가 필요합니다.";
const reviewNote = "[TEST] 개발 시드가 만든 테스트 전용 검수 기록입니다. 예시의 선택지·정답·해설 일치를 확인하는 모의 검수이며, 실제 운영자의 정식 검수를 의미하지 않습니다.";
const question = (prompt, choices, correctIds, explanation, extra = {}) => ({
  prompt: PREFIX + " " + prompt,
  choices: choices.map(([id, text]) => ({ id, text })),
  answer_mode: correctIds.length > 1 ? "MULTIPLE" : "SINGLE",
  correct_ids: correctIds, explanation, difficulty: "BEGINNER", kind: "GENERAL",
  authorship_confirmed: true, authorship_note: originalNote, ai_assisted: true, ...extra,
});
const pot = 100, bet = 50;
const callFrequency = pot / (pot + bet);
const bluffFrequency = bet / (pot + 2 * bet);
const questions = [
  question("텍사스 홀덤에서 각 플레이어가 처음 받는 홀카드는 몇 장인가요?",
    [["one","1장"],["two","2장"],["three","3장"],["four","4장"]], ["two"],
    "텍사스 홀덤에서는 개인 홀카드 2장을 받습니다. 이 문항은 단일 정답 채점 테스트용입니다."),
  question("쇼다운에서 비교하는 최종 포커 핸드는 몇 장으로 구성되나요?",
    [["two","2장"],["five","5장"],["six","6장"],["seven","7장"]], ["five"],
    "홀카드와 커뮤니티 카드 중 가장 좋은 5장 조합을 비교합니다. 홀카드 2장을 반드시 모두 써야 하는 것은 아닙니다."),
  question("앞선 베팅이 있고, 충분한 스택과 레이즈 권한이 있습니다. 일반적으로 선택 가능한 행동을 모두 고르세요.",
    [["fold","폴드"],["call","콜"],["raise","레이즈"],["check","체크"]], ["fold","call","raise"],
    "앞선 베팅을 맞춰야 하는 상황에서는 폴드, 콜, 레이즈를 선택합니다. 체크는 할 수 없습니다. 복수 정답은 정확한 선택 집합일 때만 정답입니다.",
    { difficulty: "INTERMEDIATE" }),
  question("보드는 A하트, 9스페이드, 7다이아, 4클럽, 2스페이드입니다. A는 A클럽·K다이아, B는 A다이아·Q클럽을 가지고 있습니다. 쇼다운 승자는 누구인가요?",
    [["player_a","플레이어 A"],["player_b","플레이어 B"],["tie","무승부"]], ["player_a"],
    "두 플레이어 모두 에이스 원페어입니다. A의 최종 조합은 A-A-K-9-7, B는 A-A-Q-9-7이므로 K 키커를 가진 A가 이깁니다.",
    { difficulty: "INTERMEDIATE" }),
  question("단순 GTO 모형: 팟 100에 상대가 50을 베팅합니다. 콜하면 상대의 순수 블러프는 항상 패배합니다. 블러프의 기대값을 0으로 만드는 수비자의 콜 빈도는 얼마인가요? 실전 홀덤 솔버 결과가 아닌 단일 스트리트 모형입니다.",
    [["one_third","약 33.3%"],["half","50%"],["two_thirds","약 66.7%"],["always","100%"]], ["two_thirds"],
    "콜 빈도를 c라 하면 블러프의 EV는 (1-c) × 100 - c × 50입니다. 이를 0으로 두면 c=100/150=2/3입니다. 이 결과를 실제 핸드의 콜 빈도로 그대로 사용하면 안 됩니다.",
    { difficulty: "ADVANCED", kind: "GTO", gto_evidence: {
      solver: "DO:NUTS DEMO analytic toy-game model v1 (실전 홀덤 솔버 아님)",
      assumptions: "헤즈업, 단일 스트리트, 팟 100, 베팅 50, 레이크 없음. 수비자는 콜 또는 폴드만 가능. 블러프는 콜에 항상 패배하고 가치 핸드는 항상 승리하는 완전 양극화 모형.",
      evidence: "시드의 닫힌식 계산: c=P/(P+B)=" + callFrequency + "; 블러프 혼합 비중 q=B/(P+2B)=" + bluffFrequency + ". 균형식 (1-c)P-cB=0 및 q(P+B)-(1-q)B=0.",
      frequencies: "수비 콜 " + (callFrequency*100).toFixed(4) + "%, 폴드 " + ((1-callFrequency)*100).toFixed(4) + "%; 베팅 범위 블러프 " + (bluffFrequency*100).toFixed(4) + "%, 가치 " + ((1-bluffFrequency)*100).toFixed(4) + "%.",
    } }),
  question("검수 대기 예시: 카드의 빨간색 무늬를 모두 고르세요.",
    [["heart","하트"],["diamond","다이아"],["club","클럽"],["spade","스페이드"]], ["heart","diamond"],
    "하트와 다이아가 빨간색 무늬입니다. 이 문항은 관리자가 검수 절차를 직접 진행하도록 초안으로 남겨 둡니다."),
  question("반려 예시: 언제나 가장 좋은 핸드는 무엇인가요?",
    [["ak","A-K"],["seven_two","7-2"]], ["ak"],
    "의도적으로 전제를 빠뜨린 반려 테스트 문항입니다. 게임 상황과 보드가 없어 정식 출제에 사용할 수 없습니다."),
];

function sqlFor(actors) {
  const accountRows = actors.map(a => "(" + [
    literal(a.key), literal(a.id) + "::uuid", literal(a.email),
    a.username ? literal(a.username) : "null", literal(a.name), literal(a.school ?? ""),
  ].join(",") + ")").join(",\n");
  return `
begin;
set local statement_timeout = '30s';
set local lock_timeout = '8s';
select pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25));
create temporary table donuts_demo_actors(key text primary key,id uuid not null,email text not null,username text,name text,school text);
insert into donuts_demo_actors values ${accountRows};
create temporary table donuts_demo_ids(kind text,key text,id uuid,primary key(kind,key));
create temporary table donuts_demo_result(payload jsonb);
create or replace function pg_temp.demo_actor(p_key text) returns void language plpgsql as $actor$
declare a record;
begin
 select * into strict a from pg_temp.donuts_demo_actors where key=p_key;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a.id,'email',a.email,'role','authenticated')::text,true);
end $actor$;
create or replace function pg_temp.demo_id(p_kind text,p_key text) returns uuid language sql as $id$
 select id from pg_temp.donuts_demo_ids where kind=p_kind and key=p_key
$id$;
create or replace function pg_temp.demo_enroll(p_actor text,p_kind text,p_entity uuid,p_decision text default 'APPROVED') returns uuid language plpgsql as $enroll$
declare result uuid;
begin
 perform pg_temp.demo_actor(p_actor);
 result=public.request_affiliation(p_kind,p_entity);
 perform pg_temp.demo_actor('admin');
 if p_decision is not null then
  perform public.review_affiliation_request(result,p_decision,'[TEST] 테스트 시나리오용 소속 신청 처리');
 end if;
 insert into pg_temp.donuts_demo_ids values('requests',p_actor||':'||p_kind||':'||p_entity,result);
 return result;
end $enroll$;
create or replace function pg_temp.demo_class(p_key text,p_name text,p_offsets integer[]) returns uuid language plpgsql as $class$
declare result uuid; times jsonb; d date=(clock_timestamp() at time zone 'Asia/Seoul')::date;
begin
 perform pg_temp.demo_actor('admin');
 select jsonb_agg(((d+offset_days)+time '19:00') at time zone 'Asia/Seoul' order by ord)
 into times from unnest(p_offsets) with ordinality as offsets(offset_days,ord);
 result=public.save_operating_entity('CLASS',null,null,jsonb_build_object(
  'name','[TEST] '||p_name,'description','[TEST] 개발 기능 확인용 클래스입니다. 실제 운영 일정이 아닙니다.',
  'place','[TEST] 도너츠 테스트룸','weekday',extract(dow from d+p_offsets[1])::integer,
  'start_time','19:00','active',true,'session_times',times,
  'leader_ids',jsonb_build_array((select id from pg_temp.donuts_demo_actors where key='classlead')),
  'reason','[TEST] 사용자 요청에 따른 테스트 데이터 생성'
 ));
 insert into pg_temp.donuts_demo_ids values('classes',p_key,result);
 insert into pg_temp.donuts_demo_ids
  select 'sessions',p_key||':'||session_number,id from public.class_sessions where class_id=result;
 return result;
end $class$;
create or replace function pg_temp.demo_session(p_key text,p_number integer,p_action text,p_marks jsonb default null) returns void language plpgsql as $session$
declare s public.class_sessions;
begin
 perform pg_temp.demo_actor('classlead');
 select * into strict s from public.class_sessions where id=pg_temp.demo_id('sessions',p_key||':'||p_number);
 perform public.change_class_session(s.id,s.revision,p_action,'[TEST] 출석 및 회차 상태 예시 생성',p_marks);
end $session$;
create or replace function pg_temp.demo_meeting(p_key text,p_title text,p_club text,p_owner text,p_capacity integer,p_guest boolean default false,p_day integer default 3) returns uuid language plpgsql as $meeting$
declare result uuid; d date=(clock_timestamp() at time zone 'Asia/Seoul')::date;
begin
 perform pg_temp.demo_actor(p_owner);
 result=public.save_club_meeting(null,null,jsonb_build_object(
  'club_id',pg_temp.demo_id('clubs',p_club),'title','[TEST] '||p_title,
  'description','[TEST] 테스트 전용 모임입니다. 실제 참석이나 비용 결제가 없는 예시입니다.',
  'place','[TEST] 테스트 라운지','scheduled_at',((d+p_day)+time '19:00') at time zone 'Asia/Seoul',
  'capacity',p_capacity,'guest_allowed',p_guest,'signup_open',true,'hold_hours',12,'hot',false,
  'reason','[TEST] 테스트 시나리오 생성'
 ));
 insert into pg_temp.donuts_demo_ids values('meetings',p_key,result);
 return result;
end $meeting$;
create or replace function pg_temp.demo_apply(p_actor text,p_meeting text) returns uuid language plpgsql as $apply$
declare result uuid;
begin
 perform pg_temp.demo_actor(p_actor);
 result=public.apply_club_meeting(pg_temp.demo_id('meetings',p_meeting));
 insert into pg_temp.donuts_demo_ids values('meeting_applications',p_meeting||':'||p_actor,result);
 return result;
end $apply$;
do $seed$
declare
 a record; k text; c uuid; r uuid; s uuid; v uuid; qid uuid; marks jsonb; payload jsonb; preview jsonb;
 qs jsonb=${json(questions)}; versions uuid[]='{}'; i integer;
 d date=(clock_timestamp() at time zone 'Asia/Seoul')::date;
begin
 -- Refuse to mix this first-run fixture with real member-domain data.
 if exists(select 1 from public.member_profiles) or exists(select 1 from public.classes)
   or exists(select 1 from public.clubs) or exists(select 1 from public.club_meetings)
   or exists(select 1 from public.learning_questions) or exists(select 1 from public.learning_daily_sets)
   then raise exception 'Demo seed requires empty member-domain tables; existing data is never overwritten'; end if;
 perform pg_temp.demo_actor('admin');
 if not public.is_admin() then raise exception 'Existing admin authorization required'; end if;

 insert into public.schools(name) values('[TEST] 도너츠대학교') returning id into s;
 insert into pg_temp.donuts_demo_ids values('schools','A',s);
 insert into public.schools(name) values('[TEST] 리버대학교') returning id into s;
 insert into pg_temp.donuts_demo_ids values('schools','B',s);
 for a in select * from pg_temp.donuts_demo_actors where key<>'admin' loop
  insert into public.member_profiles(id,username,name,phone,school_id,status,consent_version)
  values(a.id,a.username,a.name,'00000000000',pg_temp.demo_id('schools',a.school),'ACTIVE','TEST-FIXTURE-NOT-REAL-CONSENT-v1');
 end loop;

 perform pg_temp.demo_class('active','입문반 · 출석 운영',array[-7,0,7,14]);
 perform pg_temp.demo_class('second','심화반 · 복수 소속',array[2,9]);
 perform pg_temp.demo_class('closed','종료반 · 수강 이력',array[-21]);
 perform pg_temp.demo_class('invite','후속반 · 등록 안내',array[21,28]);
 perform pg_temp.demo_class('auto','후속반 · 자동 소속 실행 대기',array[21,28]);
 perform pg_temp.demo_actor('admin');
 c=public.save_operating_entity('CLUB',null,null,jsonb_build_object(
  'name','[TEST] 캠퍼스 포커클럽','school_id',pg_temp.demo_id('schools','A'),
  'description','[TEST] 학교가 다른 회원과 클럽장이 함께 소속된 테스트 클럽입니다.',
  'default_atc',10000,'leader_ids',jsonb_build_array((select id from pg_temp.donuts_demo_actors where key='clublead'))));
 insert into pg_temp.donuts_demo_ids values('clubs','campus',c);
 c=public.save_operating_entity('CLUB',null,null,jsonb_build_object(
  'name','[TEST] 오픈 전략클럽','school_id',pg_temp.demo_id('schools','B'),
  'description','[TEST] 복수 클럽 소속과 게스트 모임 테스트용입니다.',
  'default_atc',10000,'leader_ids',jsonb_build_array((select id from pg_temp.donuts_demo_actors where key='classlead'))));
 insert into pg_temp.donuts_demo_ids values('clubs','open',c);

 foreach k in array array['member','waitlist','history'] loop
  perform pg_temp.demo_enroll(k,'CLASS',pg_temp.demo_id('classes','active'));
  perform pg_temp.demo_enroll(k,'CLASS',pg_temp.demo_id('classes','closed'));
  perform pg_temp.demo_enroll(k,'CLUB',pg_temp.demo_id('clubs','campus'));
 end loop;
 perform pg_temp.demo_enroll('member','CLASS',pg_temp.demo_id('classes','second'));
 perform pg_temp.demo_enroll('clublead','CLASS',pg_temp.demo_id('classes','second'));
 perform pg_temp.demo_enroll('clublead','CLUB',pg_temp.demo_id('clubs','campus'));
 foreach k in array array['classlead','member','history'] loop
  perform pg_temp.demo_enroll(k,'CLUB',pg_temp.demo_id('clubs','open'));
 end loop;
 perform pg_temp.demo_enroll('applicant','CLASS',pg_temp.demo_id('classes','active'),null);
 perform pg_temp.demo_enroll('applicant','CLUB',pg_temp.demo_id('clubs','campus'),null);
 perform pg_temp.demo_enroll('classlead','CLUB',pg_temp.demo_id('clubs','campus'),null);
 perform pg_temp.demo_enroll('history','CLASS',pg_temp.demo_id('classes','second'),'REJECTED');

 perform pg_temp.demo_session('active',1,'START');
 select jsonb_object_agg(user_id::text,case when user_id=(select id from pg_temp.donuts_demo_actors where key='waitlist') then 'ABSENT' else 'PRESENT' end)
 into marks from public.class_attendance where session_id=pg_temp.demo_id('sessions','active:1');
 perform pg_temp.demo_session('active',1,'SAVE_ATTENDANCE',marks);
 perform pg_temp.demo_session('active',1,'LOCK');
 perform pg_temp.demo_session('active',1,'COMPLETE');
 perform pg_temp.demo_session('active',2,'START');
 perform pg_temp.demo_session('closed',1,'START');
 select jsonb_object_agg(user_id::text,'PRESENT') into marks from public.class_attendance where session_id=pg_temp.demo_id('sessions','closed:1');
 perform pg_temp.demo_session('closed',1,'SAVE_ATTENDANCE',marks);
 perform pg_temp.demo_session('closed',1,'LOCK');
 perform pg_temp.demo_session('closed',1,'COMPLETE');

 perform pg_temp.demo_actor('admin');
 r=public.create_class_succession(pg_temp.demo_id('classes','closed'),pg_temp.demo_id('classes','invite'),'INVITE');
 insert into pg_temp.donuts_demo_ids values('successions','invite',r);
 preview=public.preview_class_succession(r);
 perform public.execute_class_succession(r,preview->>'fingerprint',true,'[TEST] 등록 안내 알림 예시 생성, 실제 소속은 신청·승인 후 확정');
 r=public.create_class_succession(pg_temp.demo_id('classes','closed'),pg_temp.demo_id('classes','auto'),'AUTO_ENROLL');
 insert into pg_temp.donuts_demo_ids values('successions','auto',r);

 perform pg_temp.demo_meeting('available','참가 가능한 정기 모임','campus','clublead',6);
 perform pg_temp.demo_apply('history','available');
 perform pg_temp.demo_actor('admin');
 select to_jsonb(m) into payload from public.club_meetings m where id=pg_temp.demo_id('meetings','available');
 perform public.save_club_meeting((payload->>'id')::uuid,(payload->>'revision')::integer,
  payload||jsonb_build_object('hot',true,'reason','[TEST] 관리자 HOT 표시 예시'));
 perform pg_temp.demo_meeting('full','만석 · 대기열 모임','campus','clublead',1);
 perform pg_temp.demo_apply('member','full');
 perform pg_temp.demo_apply('waitlist','full');
 perform pg_temp.demo_apply('history','full');
 perform pg_temp.demo_meeting('offered','자리 확정 대기 모임','campus','clublead',1);
 r=pg_temp.demo_apply('history','offered');
 perform pg_temp.demo_apply('waitlist','offered');
 perform pg_temp.demo_apply('member','offered');
 perform pg_temp.demo_actor('history');
 perform public.respond_meeting_application(r,'CANCEL');

 perform pg_temp.demo_meeting('expired','확정 기한 만료 이력','campus','clublead',1);
 r=pg_temp.demo_apply('history','expired');
 v=pg_temp.demo_apply('member','expired');
 perform pg_temp.demo_apply('waitlist','expired');
 perform pg_temp.demo_actor('history');
 perform public.respond_meeting_application(r,'CANCEL');
 -- Only this new fixture's timestamp is adjusted to stage an expired offer.
 update public.meeting_applications set offer_expires_at=clock_timestamp()-interval '1 minute' where id=v;
 perform pg_temp.demo_actor('admin');
 perform public.reconcile_meeting_waitlist(pg_temp.demo_id('meetings','expired'));

 perform pg_temp.demo_meeting('guest','게스트 허용 · 정원 제한 없음','open','classlead',null,true);
 perform pg_temp.demo_apply('applicant','guest');
 perform pg_temp.demo_meeting('recent','오늘 완료한 모임','campus','clublead',6,false,0);
 perform pg_temp.demo_apply('member','recent');
 perform pg_temp.demo_apply('history','recent');
 perform pg_temp.demo_actor('clublead');
 perform public.close_club_meeting(pg_temp.demo_id('meetings','recent'),1,'COMPLETED','[TEST] 완료 후 24시간 이내 표시 예시');
 perform pg_temp.demo_meeting('archived','지난 모임 · 24시간 경과','campus','clublead',6,false,-3);
 perform pg_temp.demo_apply('member','archived');
 perform pg_temp.demo_apply('history','archived');
 perform pg_temp.demo_actor('clublead');
 perform public.close_club_meeting(pg_temp.demo_id('meetings','archived'),1,'COMPLETED','[TEST] 지난 모임 예시: 시드에서 완료 시각을 과거로 조정');
 update public.club_meetings set completed_at=clock_timestamp()-interval '48 hours' where id=pg_temp.demo_id('meetings','archived');
 perform public.reconcile_meeting_waitlist(pg_temp.demo_id('meetings','archived'));
 perform pg_temp.demo_meeting('cancelled','취소된 모임 이력','campus','clublead',6);
 perform pg_temp.demo_apply('member','cancelled');
 perform pg_temp.demo_actor('clublead');
 perform public.close_club_meeting(pg_temp.demo_id('meetings','cancelled'),1,'CANCELLED','[TEST] 모임 취소와 이력 보존 예시');

 perform pg_temp.demo_actor('admin');
 for i in 0..6 loop
  v=public.save_learning_question(null,qs->i);
  select question_id into qid from public.learning_question_versions where id=v;
  insert into pg_temp.donuts_demo_ids values('questions','q'||(i+1),qid);
  insert into pg_temp.donuts_demo_ids values('versions','q'||(i+1)||':1',v);
  if i<5 then
   perform public.review_learning_question(v,true,'{"original":true,"answer":true,"explanation":true,"gto":true}',${literal(reviewNote)});
   versions=array_append(versions,v);
  elsif i=6 then
   perform public.review_learning_question(v,false,'{}','[TEST] 모의 반려 기록: 상황과 보드 전제가 없어 정답을 일반화할 수 없습니다.');
  end if;
 end loop;
 v=public.save_learning_question(pg_temp.demo_id('questions','q1'),(qs->0)||jsonb_build_object('prompt','[TEST] 홀카드 수 · 버전 2 재검수 대기'));
 insert into pg_temp.donuts_demo_ids values('versions','q1:2',v);
 for i in 0..6 loop
  perform public.schedule_daily_learning(d+i,versions);
 end loop;
 perform public.protect_learning_day(d-1,'[TEST] 학습 장애 예외일 표시용 데이터, 실제 장애 기록 아님');
 select jsonb_object_agg(id::text,to_jsonb(correct_ids)) into marks
  from public.learning_question_versions where id=any(versions);
 perform pg_temp.demo_actor('classlead');
 payload=public.submit_daily_learning(d,marks);
 insert into pg_temp.donuts_demo_ids values('learning_attempts','perfect',(payload->>'id')::uuid);
 marks=marks||jsonb_build_object(
  versions[3]::text,jsonb_build_array('fold'),
  versions[4]::text,jsonb_build_array('tie'),
  versions[5]::text,jsonb_build_array('half'));
 perform pg_temp.demo_actor('history');
 payload=public.submit_daily_learning(d,marks);
 insert into pg_temp.donuts_demo_ids values('learning_attempts','review',(payload->>'id')::uuid);

 -- No real email is sent. Keep fixture outbox entries explicitly cancelled.
 update public.notification_emails set status='CANCELLED',last_error='[TEST] Fixture: email delivery intentionally disabled',leased_until=null,lease_id=null
 where recipient in(select email from pg_temp.donuts_demo_actors where key<>'admin')
   and status in('PENDING','PROCESSING','FAILED');
 insert into pg_temp.donuts_demo_result values(jsonb_build_object(
  'tag',${literal(TAG)},'day',d,'last_learning_day',d+6,
  'ids',(select jsonb_agg(jsonb_build_object('kind',kind,'key',key,'id',id) order by kind,key) from pg_temp.donuts_demo_ids),
  'counts',jsonb_build_object('accounts',6,'schools',2,'classes',5,'sessions',11,'clubs',2,'meetings',8,'questions',7,'question_versions',8,'published_versions',5,'daily_sets',7),
  'email_delivery','disabled for this fixture; no provider calls',
  'learning_review','synthetic fixture records; not formal human review'
 ));
end $seed$;
commit;
select payload as seed_result from pg_temp.donuts_demo_result;
`;
}

try {
  const rows = await database(`select jsonb_build_object(
    'admin',(select jsonb_build_object('id',u.id,'email',u.email) from auth.users u join public.admin_emails a on lower(a.email)=lower(u.email)
      where lower(u.email)=${literal(adminEmail)} and u.email_confirmed_at is not null and u.deleted_at is null),
    'existing_demo_users',(select count(*) from auth.users where raw_app_meta_data->>'seed_tag'=${literal(TAG)}),
    'member_domain_rows',(select count(*) from public.member_profiles)+(select count(*) from public.classes)+(select count(*) from public.clubs)
      +(select count(*) from public.club_meetings)+(select count(*) from public.learning_questions)+(select count(*) from public.learning_daily_sets),
    'retained',jsonb_build_object('events',(select count(*) from public.events),'seasons',(select count(*) from public.seasons)),
    'signup_open',(select signup_open from public.membership_settings where singleton=true)
  ) as context`,true);
  const before=rows[0]?.context;
  if (!before?.admin) throw new Error("A verified existing administrator is required.");
  if (Number(before.existing_demo_users) || Number(before.member_domain_rows)) throw new Error("Demo data already exists or member domains are in use. This script never overwrites existing data.");
  privateFile("before.json",before);
  privateFile("accounts.md","# DO:NUTS 테스트 계정\n\n테스트 전용입니다. 실제 이메일 수신함이 없으며 관리자 권한은 없습니다.\n비밀번호를 저장소나 공개 문서에 넣지 마세요.\n\n| 테스트 계정명 | 로그인 이메일 | 비밀번호 | 역할 |\n|---|---|---|---|\n"+roles.map(a=>"| "+a.username+" | "+a.email+" | "+a.password+" | "+a.purpose+" |").join("\n")+"\n\n회원 로그인: https://donutskr.vercel.app/login\n이메일 열의 주소로 로그인합니다. 테스트 계정명은 로그인 아이디가 아닙니다.\n기존 관리자 계정의 비밀번호는 변경하지 않았습니다.\n");
  const service=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  report.status="CREATING_TEST_IDENTITIES";persist();
  for (const actor of roles) {
    const {data,error}=await service.auth.admin.createUser({
      email:actor.email,password:actor.password,email_confirm:true,
      app_metadata:{seed_tag:TAG},
      user_metadata:{seed_tag:TAG,fixture_name:actor.name},
    });
    if(error || !data.user) throw new Error("Test identity creation failed for "+actor.username+": "+(error?.message??"Missing identity"));
    actor.id=data.user.id;
    report.accounts.push({key:actor.key,id:actor.id,username:actor.username,email:actor.email,purpose:actor.purpose});
    persist();
  }
  const actors=[{key:"admin",...before.admin,name:"Existing administrator acting on the requested test fixture"},...roles.map(({password,...a})=>a)];
  const sql=sqlFor(actors);
  privateFile("applied.sql",sql);
  report.status="APPLYING_DOMAIN_DATA";persist();
  const applied=await database(sql);
  report.data=applied.find(row=>row.seed_result)?.seed_result??null;
  report.status="APPLIED";report.appliedAt=new Date().toISOString();persist();
  console.log(JSON.stringify({status:report.status,project,credentials:join(root,"accounts.md"),manifest:join(root,"manifest.json"),summary:report.data?.counts,learning:report.data?{from:report.data.day,through:report.data.last_learning_day}:null}));
} catch(error) {
  // Never delete uncertain production data on an HTTP timeout. Preserve the
  // exact newly-created identities and SQL for an explicit recovery decision.
  report.status="NEEDS_ATTENTION";report.error=error instanceof Error?error.message:"Unknown seeding error";persist();
  console.error(JSON.stringify({status:report.status,error:report.error,createdTestAccounts:report.accounts.length,manifest:join(root,"manifest.json")}));
  process.exitCode=1;
}
