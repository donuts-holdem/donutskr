import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

export async function runMemberMeetingChecks({owner,as,check,rejected,actors,ids}) {
  const person={id:randomUUID(),email:'withdraw-check@donuts.test'};
  await owner.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)',[person.id,person.email,{name:'개인정보시험',phone:'01012345678'}]);
  await owner.query("insert into public.member_profiles(id,name,phone,school_id,status,consent_version) values($1,'개인정보시험','01012345678',$2,'ACTIVE','v1')",[person.id,ids.schoolA]);
  let meeting;
  await check('DONUTS meetings require admin creation and admit active members without a club',async()=>{
    const payload={club_id:null,title:'DONUTS test meeting',place:'Fixture room',scheduled_at:'2027-01-01T10:00:00Z',capacity:1,hold_hours:12,hot:true,signup_open:true};
    await rejected(()=>as(person,'select public.save_club_meeting(null,null,$1)',[payload]),'forbidden');
    meeting=(await as(actors.admin,'select public.save_club_meeting(null,null,$1) id',[payload])).rows[0].id;
    const application=(await as(person,'select public.apply_club_meeting($1) id',[meeting])).rows[0].id;
    assert.ok(application);
    const board=(await as(person,'select public.get_club_meeting_board($1) board',[meeting])).rows[0].board;
    assert.equal(board.club_name,'DO:NUTS');assert.equal(board.confirmed,1);
    assert.equal(board.can_manage,false);assert.equal(board.application.status,'CONFIRMED');
  });
  await check('Admin profile edits validate school and revision while ordinary users cannot edit others',async()=>{
    const payload={name:'개인정보변경',phone:'01087654321',school_id:ids.schoolB};
    await rejected(()=>as(person,'select public.update_member_profile($1,1,$2,$3)',[person.id,payload,'Correction']),'forbidden');
    await as(actors.admin,'select public.update_member_profile($1,1,$2,$3)',[person.id,payload,'Correction']);
    await rejected(()=>as(actors.admin,'select public.update_member_profile($1,1,$2,$3)',[person.id,payload,'Stale']),'stale_preview');
    const p=(await owner.query('select * from public.member_profiles where id=$1',[person.id])).rows[0];
    assert.equal(p.name,payload.name);assert.equal(p.school_id,ids.schoolB);
  });
  await check('Member directory combines email and affiliation filters without exposing data to members',async()=>{
    const result=(await as(actors.admin,'select public.admin_member_directory($1) data',[{q:person.email}])).rows[0].data;
    assert.equal(result.members.length,1);assert.equal(result.members[0].id,person.id);
    const beyond=(await as(actors.admin,'select public.admin_member_directory($1) data',[{q:person.email,page:2}])).rows[0].data;
    assert.equal(beyond.count,1);assert.equal(beyond.members.length,0);
    await rejected(()=>as(person,'select public.admin_member_directory($1)',[{}]),'forbidden');
  });
  await check('Meeting summaries sort HOT first and include only the viewer application with aggregate capacity',async()=>{
    const payload={club_id:null,title:'Regular earlier meeting',place:'Fixture room',scheduled_at:'2026-12-01T10:00:00Z',capacity:2,hold_hours:12,hot:false,signup_open:true};
    const regular=(await as(actors.admin,'select public.save_club_meeting(null,null,$1) id',[payload])).rows[0].id;
    const result=(await as(person,'select public.get_meeting_summaries() data')).rows[0].data;
    assert.ok(result.findIndex(row=>row.id===meeting)<result.findIndex(row=>row.id===regular));
    const own=result.find(row=>row.id===meeting);
    assert.equal(own.confirmed,1);assert.equal(own.application.status,'CONFIRMED');assert.equal(own.club_name,'DO:NUTS');
    assert.equal(own.application.user_id,undefined);
    assert.deepEqual((await as(person,'select public.get_meeting_summaries(true) data')).rows[0].data,[]);
  });
  await check('Admin affiliation additions reuse approval validation and removals preserve membership history',async()=>{
    const course=(await owner.query("insert into public.classes(name,place,weekday,start_time) values('Directory affiliation','Room',1,'19:00') returning id")).rows[0].id;
    await rejected(()=>as(person,"select public.admin_set_member_affiliation($1,'CLASS',$2,true,'Test')",[person.id,course]),'forbidden');
    await as(actors.admin,"select public.admin_set_member_affiliation($1,'CLASS',$2,true,'Test')",[person.id,course]);
    assert.equal((await owner.query('select active from public.class_memberships where class_id=$1 and user_id=$2',[course,person.id])).rows[0].active,true);
    const filtered=(await as(actors.admin,'select public.admin_member_directory($1) data',[{class_id:course}])).rows[0].data;
    assert.equal(filtered.members[0].id,person.id);
    await as(actors.admin,"select public.admin_set_member_affiliation($1,'CLASS',$2,false,'Remove')",[person.id,course]);
    assert.equal((await owner.query('select active from public.class_memberships where class_id=$1 and user_id=$2',[course,person.id])).rows[0].active,false);
  });
  await check('Withdrawal blocks access, ends memberships, scrubs snapshots and remains resumable until Auth cleanup',async()=>{
    await rejected(()=>as(person,'select public.begin_member_withdrawal($1,$2)',[person.id,'Test']),'forbidden');
    await owner.query('insert into public.class_memberships(class_id,user_id) values($1,$2)',[ids.classA,person.id]);
    await owner.query("insert into public.affiliation_requests(user_id,kind,class_id,decision_reason) values($1,'CLASS',$2,'개인정보시험 요청')",[person.id,ids.classA]);
    await owner.query("insert into public.membership_audit_log(user_id,actor_id,action,details) values($1,$2,'TEST',$3)",[person.id,actors.admin.id,{before:{name:'개인정보시험',phone:'01012345678'},after:{name:'개인정보변경',phone:'01087654321'},email:person.email}]);
    const auditCount=(await owner.query('select count(*)::int n from public.membership_audit_log where user_id=$1',[person.id])).rows[0].n;
    await as(actors.admin,'select public.begin_member_withdrawal($1,$2)',[person.id,'User request']);
    const p=(await owner.query('select * from public.member_profiles where id=$1',[person.id])).rows[0];
    assert.equal(p.status,'WITHDRAWN');assert.equal(p.name,'탈퇴 회원');assert.equal(p.username,null);assert.equal(p.school_id,null);
    assert.equal((await owner.query('select count(*)::int n from public.class_memberships where user_id=$1 and active',[person.id])).rows[0].n,0);
    const logs=(await owner.query('select details from public.membership_audit_log where user_id=$1',[person.id])).rows;
    assert.ok(logs.length>=auditCount);assert.doesNotMatch(JSON.stringify(logs),/개인정보시험|개인정보변경|01012345678|01087654321|withdraw-check@/);
    assert.equal((await owner.query('select status from public.member_withdrawals where user_id=$1',[person.id])).rows[0].status,'AUTH_PENDING');
    await as(actors.admin,'select public.begin_member_withdrawal($1,$2)',[person.id,'Retry']);
    await rejected(()=>as(actors.admin,'select public.update_member_profile($1,$2,$3,$4)',[person.id,p.revision,{name:'Resurrect',phone:'01000000000',school_id:ids.schoolA},'Invalid']),'member_status_blocked');
    if(meeting){const app=(await owner.query('select status from public.meeting_applications where meeting_id=$1 and user_id=$2',[meeting,person.id])).rows[0];assert.equal(app.status,'INELIGIBLE');}
    assert.equal((await owner.query('select status from public.affiliation_requests where user_id=$1 and class_id=$2',[person.id,ids.classA])).rows[0].status,'REJECTED');
    await rejected(()=>as(actors.admin,'select public.finish_member_withdrawal($1)',[person.id]),'withdrawal_auth_pending');
    await owner.query('update auth.users set deleted_at=now() where id=$1',[person.id]);
    await as(actors.admin,'select public.finish_member_withdrawal($1)',[person.id]);
    assert.equal((await owner.query('select status from public.member_withdrawals where user_id=$1',[person.id])).rows[0].status,'COMPLETE');
  });
  await check('Withdrawal redacts copied class reasons and historical private schools without changing XP or other members',async()=>{
    const target={id:randomUUID(),email:'withdraw-history@donuts.test'},other={id:randomUUID(),email:'retained-history@donuts.test'};
    const name='탈퇴사유검증',phone='01098763452',school='이전직접입력학교',otherName='기록보존회원';
    await owner.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())',[target.id,target.email,other.id,other.email]);
    await owner.query("insert into public.member_profiles(id,name,phone,other_school_name,status,consent_version) values($1,$2,$3,$4,'ACTIVE','v1'),($5,$6,'01033335555','다른학교','ACTIVE','v1')",[target.id,name,phone,school,other.id,otherName]);
    await as(actors.admin,'select public.update_member_profile($1,1,$2,$3)',[target.id,{name,phone,school_id:ids.schoolA},'School correction']);
    const course=(await owner.query("insert into public.classes(name,place,weekday,start_time) values('Withdrawal history','Room',1,'19:00') returning id")).rows[0].id;
    await owner.query('insert into public.class_memberships(class_id,user_id) values($1,$2),($1,$3)',[course,target.id,other.id]);
    const reason=`${name} ${phone} 출석 정정, ${otherName} 기록 유지`;
    const session=(await owner.query('insert into public.class_sessions(class_id,session_number,scheduled_at,cancelled_at,cancellation_reason) values($1,1,now(),now(),$2) returning *',[course,reason])).rows[0];
    const operation=(await owner.query("insert into public.entity_operation_log(kind,entity_id,session_id,actor_id,action,reason,before_state) values('CLASS',$1,$2,$3,'SESSION_CANCELLED',$4,$5) returning *",[course,session.id,actors.admin.id,reason,{members:[{user_id:target.id,name},{user_id:other.id,name:otherName}]}])).rows[0];
    await owner.query('insert into public.xp_ledger(user_id,session_id,operation_id,delta,actor_id,reason) values($1,$2,$3,100,$4,$5),($6,$2,$3,100,$4,$5)',[target.id,session.id,operation.id,actors.admin.id,reason,other.id]);
    const beforeLedger=(await owner.query('select * from public.xp_ledger where session_id=$1 order by id',[session.id])).rows;
    const otherProfile=(await owner.query('select * from public.member_profiles where id=$1',[other.id])).rows[0];
    await as(actors.admin,'select public.begin_member_withdrawal($1,$2)',[target.id,'Requested cleanup']);
    const afterLedger=(await owner.query('select * from public.xp_ledger where session_id=$1 order by id',[session.id])).rows;
    const afterSession=(await owner.query('select * from public.class_sessions where id=$1',[session.id])).rows[0];
    const afterOperation=(await owner.query('select * from public.entity_operation_log where id=$1',[operation.id])).rows[0];
    const audit=(await owner.query('select details from public.membership_audit_log where user_id=$1',[target.id])).rows;
    assert.doesNotMatch(JSON.stringify({afterLedger,afterSession,afterOperation,audit}),/탈퇴사유검증|01098763452|이전직접입력학교/);
    const withoutReason=rows=>rows.map(row=>({...row,reason:undefined}));
    assert.deepEqual(withoutReason(afterLedger),withoutReason(beforeLedger));
    assert.ok(afterLedger.every(row=>row.reason.includes(otherName)));
    assert.deepEqual({...afterSession,cancellation_reason:session.cancellation_reason},session);
    assert.deepEqual(afterOperation.before_state.members[1],operation.before_state.members[1]);
    assert.equal(afterOperation.before_state.members[0].user_id,target.id);
    assert.deepEqual((await owner.query('select * from public.member_profiles where id=$1',[other.id])).rows[0],otherProfile);
    assert.equal((await owner.query('select active from public.class_memberships where class_id=$1 and user_id=$2',[course,other.id])).rows[0].active,true);
  });
  await check('Withdrawal completion clears Auth actor and nested subject identifiers and IPs while retaining events and unrelated audits',async()=>{
    const target={id:randomUUID(),email:'withdraw-audit@donuts.test'};
    await owner.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[target.id,target.email]);
    await owner.query("insert into public.member_profiles(id,name,phone,school_id,status,consent_version) values($1,'인증기록검증','01044446666',$2,'ACTIVE','v1')",[target.id,ids.schoolA]);
    const auditIds=Array.from({length:4},()=>randomUUID());
    const payloads=[
      {action:'login',actor_id:target.id,actor_username:target.email,actor_name:'인증기록검증',log_type:'account',traits:{provider:'email'}},
      {action:'user_deleted',actor_id:actors.admin.id,actor_username:actors.admin.email,traits:{user_id:target.id,user_email:target.email,user_phone:'01044446666',provider:'email'}},
      {action:'user_modified',actor_id:actors.admin.id,user_id:target.id,user_email:target.email,user_phone:'01044446666'},
      {action:'login',actor_id:actors.admin.id,actor_username:actors.admin.email,traits:{provider:'email'}},
    ];
    for(let i=0;i<auditIds.length;i++)await owner.query('insert into auth.audit_log_entries(id,payload,ip_address) values($1,$2,$3)',[auditIds[i],payloads[i],`192.0.2.${i+1}`]);
    const before=(await owner.query('select * from auth.audit_log_entries where id=any($1) order by id',[auditIds])).rows;
    await rejected(()=>as(null,'select public.begin_member_withdrawal($1,$2)',[target.id,'Unauthorized']),'42501');
    await as(actors.admin,'select public.begin_member_withdrawal($1,$2)',[target.id,'Audit test']);
    await rejected(()=>as(actors.admin,'select public.finish_member_withdrawal($1)',[target.id]),'withdrawal_auth_pending');
    await owner.query('update auth.users set deleted_at=now() where id=$1',[target.id]);
    await rejected(()=>as(target,'select public.finish_member_withdrawal($1)',[target.id]),'forbidden');
    await as(actors.admin,'select public.finish_member_withdrawal($1)',[target.id]);
    const after=(await owner.query('select * from auth.audit_log_entries where id=any($1) order by id',[auditIds])).rows;
    assert.equal(after.length,before.length);
    for(let i=0;i<3;i++){
      const row=after.find(row=>row.id===auditIds[i]);
      assert.doesNotMatch(JSON.stringify(row),/withdraw-audit@|01044446666|인증기록검증|192\.0\.2\./);
      assert.equal(row.payload.action,payloads[i].action);assert.equal(row.payload.actor_id,payloads[i].actor_id);
      assert.deepEqual(row.created_at,before.find(item=>item.id===row.id).created_at);
    }
    const nested=after.find(row=>row.id===auditIds[1]);
    assert.equal(nested.payload.traits.user_id,target.id);assert.equal(nested.payload.traits.provider,'email');
    assert.equal(nested.payload.actor_username,actors.admin.email);
    assert.deepEqual(after.find(row=>row.id===auditIds[3]),before.find(row=>row.id===auditIds[3]));
    await as(actors.admin,'select public.finish_member_withdrawal($1)',[target.id]);
    assert.deepEqual((await owner.query('select * from auth.audit_log_entries where id=any($1) order by id',[auditIds])).rows,after);
    assert.equal((await owner.query('select status from public.member_withdrawals where user_id=$1',[target.id])).rows[0].status,'COMPLETE');
  });
  await check('Snapshot redaction preserves UUIDs, state and a different member with the same name',async()=>{
    const target='ab000000-0000-4000-8000-000000000001',other='ab000000-0000-4000-8000-000000000002';
    const before={action:'ACTIVE',members:[{user_id:target,name:'ab',status:'ACTIVE',phone:'01012341234'},{user_id:other,name:'ab',status:'ACTIVE',phone:'01055557777'}]};
    const value=(await owner.query('select public.redact_member_values($1,$2,$3) data',[before,['ab','ACTIVE','01012341234'],target])).rows[0].data;
    assert.equal(value.action,'ACTIVE');assert.equal(value.members[0].user_id,target);assert.equal(value.members[0].name,'[삭제됨]');assert.equal(value.members[0].phone,'[삭제됨]');
    assert.equal(value.members[0].status,'ACTIVE');assert.deepEqual(value.members[1],before.members[1]);
  });
}
