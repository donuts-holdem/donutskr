import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Called by the isolated database runner after all additive migrations apply.
export async function runClassSessionChecks({ owner, as, check, rejected, actors }) {
  const schoolId = randomUUID();
  await owner.query('insert into public.schools(id,name) values($1,$2)', [schoolId, 'Session content test school']);
  const createActor = async (name, status = 'ACTIVE') => {
    const id = randomUUID();
    const actor = { id, email: `content-${id}@donuts.test` };
    await owner.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, actor.email]);
    await owner.query('insert into public.member_profiles(id,username,name,phone,school_id,status,consent_version) values($1,$2,$3,$4,$5,$6,$7)', [id, `content_${id.slice(0, 8)}`, name, '01000000000', schoolId, status, 'v1']);
    return actor;
  };
  const leader = await createActor('Content leader');
  const member = await createActor('Content member');
  const outsider = await createActor('Content outsider');
  const suspended = await createActor('Content suspended', 'SUSPENDED');
  const classId = randomUUID(); const otherClassId = randomUUID(); const clubId = randomUUID();
  await owner.query("insert into public.classes(id,name,place,weekday,start_time) values($1,'Content class','Test venue',1,'19:00'),($2,'Other content class','Test venue',2,'19:00')", [classId, otherClassId]);
  await owner.query('insert into public.class_leaders(class_id,user_id,assigned_by) values($1,$2,$3)', [classId, leader.id, actors.admin.id]);
  await owner.query('insert into public.class_memberships(class_id,user_id) values($1,$2)', [classId, member.id]);
  const sessionId = randomUUID(); const otherSessionId = randomUUID();
  await owner.query("insert into public.class_sessions(id,class_id,session_number,scheduled_at) values($1,$2,1,'2026-09-01 19:00+09'),($3,$4,1,'2026-09-02 19:00+09')", [sessionId, classId, otherSessionId, otherClassId]);
  const save = (actor, revision, title = 'Position Game', description = '포지션별 오픈 범위') => as(actor,
    'select public.save_class_session_content($1,$2,$3,$4,$5)', [classId, sessionId, revision, title, description]);

  await check('session content requires the actual class scope and current leadership', async () => {
    await rejected(() => save(outsider, 1), 'forbidden');
    await rejected(() => save(member, 1), 'forbidden');
    await rejected(() => as(leader, 'select public.save_class_session_content($1,$2,1,$3,$4)', [classId, otherSessionId, 'Wrong class', '']), 'invalid_entity');
    await save(leader, 1, '  Position Game  ', '포지션별 오픈 범위');
    const saved = (await owner.query('select title,description,revision from public.class_sessions where id=$1', [sessionId])).rows[0];
    assert.deepEqual(saved, { title: 'Position Game', description: '포지션별 오픈 범위', revision: 2 });
    await owner.query('delete from public.class_leaders where class_id=$1 and user_id=$2', [classId, leader.id]);
    await rejected(() => save(leader, 2), 'forbidden');
    await owner.query('insert into public.class_leaders(class_id,user_id,assigned_by) values($1,$2,$3)', [classId, leader.id, actors.admin.id]);
  });

  await check('session content rejects stale and malformed writes without changing the saved title', async () => {
    await rejected(() => save(leader, 1, 'Stale'), 'stale_operation');
    await rejected(() => save(leader, 2, ' '), 'invalid_entity');
    await rejected(() => save(leader, 2, '\n\t'), 'invalid_entity');
    await rejected(() => save(leader, 2, '가'.repeat(121)), 'invalid_entity');
    await rejected(() => save(leader, 2, 'Valid', '가'.repeat(4001)), 'invalid_entity');
    await rejected(() => as(leader, "update public.class_sessions set title='Direct write' where id=$1", [sessionId]), '42501');
    assert.equal((await owner.query('select title from public.class_sessions where id=$1', [sessionId])).rows[0].title, 'Position Game');
  });

  await check('session content is visible only to affiliated members, scoped leaders and historical attendees', async () => {
    assert.deepEqual((await as(member, 'select title,description from public.class_sessions where id=$1', [sessionId])).rows, [{ title: 'Position Game', description: '포지션별 오픈 범위' }]);
    assert.equal((await as(outsider, 'select id from public.class_sessions where id=$1', [sessionId])).rowCount, 0);
    assert.equal((await as(suspended, 'select id from public.class_sessions where id=$1', [sessionId])).rowCount, 0);
    await as(leader, "select public.change_class_session($1,2,'START')", [sessionId]);
    await owner.query('update public.class_memberships set active=false where class_id=$1 and user_id=$2', [classId, member.id]);
    assert.equal((await as(member, 'select title from public.class_sessions where id=$1', [sessionId])).rows[0].title, 'Position Game');
  });

  await check('session content edits preserve completed attendance, dates, cancellation and XP history', async () => {
    const change = async (action, marks = null, reason = null) => {
      const revision = (await owner.query('select revision from public.class_sessions where id=$1', [sessionId])).rows[0].revision;
      return as(leader, 'select public.change_class_session($1,$2,$3,$4,$5)', [sessionId, revision, action, reason, marks]);
    };
    await change('SAVE_ATTENDANCE', { [member.id]: 'PRESENT' });
    await change('LOCK'); await change('COMPLETE'); await change('CANCEL', null, 'Fixture cancellation');
    const before = (await owner.query('select to_jsonb(s) value from public.class_sessions s where id=$1', [sessionId])).rows[0].value;
    const attendance = (await owner.query('select * from public.class_attendance where session_id=$1 order by roster_run,user_id', [sessionId])).rows;
    const ledger = (await owner.query('select * from public.xp_ledger where session_id=$1 order by created_at,id', [sessionId])).rows;
    await save(leader, before.revision, 'Position Game · 수정', '수정한 수업 내용');
    const after = (await owner.query('select to_jsonb(s) value from public.class_sessions s where id=$1', [sessionId])).rows[0].value;
    assert.deepEqual(after, { ...before, title: 'Position Game · 수정', description: '수정한 수업 내용', revision: before.revision + 1 });
    assert.deepEqual((await owner.query('select * from public.class_attendance where session_id=$1 order by roster_run,user_id', [sessionId])).rows, attendance);
    assert.deepEqual((await owner.query('select * from public.xp_ledger where session_id=$1 order by created_at,id', [sessionId])).rows, ledger);
    assert.deepEqual(ledger.map(row => row.delta), [100, -100]);
    const event = (await owner.query("select before_state,after_state from public.entity_operation_log where session_id=$1 and action='SESSION_CONTENT_UPDATED' order by created_at desc limit 1", [sessionId])).rows[0];
    assert.equal(event.before_state.title, 'Position Game'); assert.equal(event.after_state.title, 'Position Game · 수정');
    await owner.query('update public.classes set archived_at=now(),active=false where id=$1', [classId]);
    await rejected(() => save(actors.admin, after.revision), 'entity_archived');
    assert.equal((await as(member, 'select title from public.class_sessions where id=$1', [sessionId])).rows[0].title, 'Position Game · 수정');
  });

  await check('club member count includes active affiliations without exposing membership rows', async () => {
    await owner.query("insert into public.clubs(id,name,school_id) values($1,'Content club',$2)", [clubId, schoolId]);
    await owner.query('insert into public.club_memberships(club_id,user_id,active) values($1,$2,true),($1,$3,true),($1,$4,false)', [clubId, member.id, suspended.id, leader.id]);
    assert.equal((await as(outsider, 'select public.get_club_member_count($1) count', [clubId])).rows[0].count, 2);
    assert.equal((await as(outsider, 'select user_id from public.club_memberships where club_id=$1', [clubId])).rowCount, 0);
    await rejected(() => as(suspended, 'select public.get_club_member_count($1)', [clubId]), 'forbidden');
    await rejected(() => as(null, 'select public.get_club_member_count($1)', [clubId]), '42501');
  });
}
