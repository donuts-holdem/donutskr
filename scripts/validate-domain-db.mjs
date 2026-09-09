import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
// Optional, isolated test dependencies; never connects to a hosted database.
const dependencyRoot=process.env.DONUTS_DB_TEST_DEPS;
if(!dependencyRoot)throw new Error('Set DONUTS_DB_TEST_DEPS to a temporary prefix containing pg and @embedded-postgres/<platform>-<arch>. See docs/DOMAIN_EXTENSIONS.md.');
const require=createRequire(resolve(dependencyRoot,'package.json'));
const {default:pg}=await import(pathToFileURL(require.resolve('pg')).href);
const {initdb,pg_ctl}=await import(pathToFileURL(require.resolve('@embedded-postgres/'+process.platform+'-'+process.arch)).href);

const root = mkdtempSync(join(tmpdir(),'donuts-domain-db-'));
const repo = process.cwd();
const config = { host: `${root}/socket`, port: 55440, user: 'donuts_test_owner', database: 'postgres' };
const report = { startedAt: new Date().toISOString(), checks: [], limitations: ['Supabase Auth identities and JWT claims are simulated locally; provider email delivery and live PostgREST embedding are not covered.'] };
const actors = {};
const ids = {};
let owner;
let started = false;
let counter = 0;
const nap = ms => new Promise(resolve => setTimeout(resolve, ms));
async function connect(application_name = 'donuts-policy-check') {
  const client = new pg.Client({ ...config, application_name });
  await client.connect();
  await client.query("set statement_timeout = '8s'");
  return client;
}
async function as(actor, sql, params = [], applicationName) {
  const client = await connect(applicationName);
  try {
    await client.query('begin');
    await client.query(`set local role ${actor ? 'authenticated' : 'anon'}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(actor ? { sub: actor.id, email: actor.email, role: 'authenticated' } : {})]);
    const result = await client.query(sql, params);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { await client.end(); }
}
async function rejected(task, expected) {
  let caught;
  try { await task(); } catch (error) { caught = error; }
  assert.ok(caught, `Expected rejection: ${expected}`);
  assert.ok(caught.code === expected || caught.message.includes(expected), `Expected ${expected}; got ${caught.code}: ${caught.message}`);
}
async function check(name, task) {
  try {
    await task();
    report.checks.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, status: 'FAIL', code: error.code, error: error.message });
    console.log(`FAIL ${name}: ${error.code ?? ''} ${error.message}`);
  }
}
async function fixture(name, status = 'ACTIVE', verified = true) {
  const actor = { id: randomUUID(), email: `${name}@donuts.test` };
  await owner.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)', [actor.id, actor.email, verified ? new Date() : null]);
  await owner.query('insert into public.member_profiles(id,username,name,phone,school_id,status,consent_version) values($1,$2,$3,$4,$5,$6,$7)', [actor.id, `fixture_${++counter}`, name, '01000000000', ids.schoolA, status, 'v1']);
  actors[name] = actor;
  return actor;
}
async function statusOf(actor) { return (await owner.query('select status from public.member_profiles where id=$1', [actor.id])).rows[0]?.status; }
async function request(actor, kind, entity) { return (await as(actor, 'select public.request_affiliation($1,$2) id', [kind, entity])).rows[0].id; }
async function review(actor, id, decision = 'APPROVED', reason = null) { return as(actor, 'select public.review_affiliation_request($1,$2,$3)', [id, decision, reason]); }
async function activeMembership(actor, kind, entity) {
  const table = kind === 'CLASS' ? 'class_memberships' : 'club_memberships';
  const column = kind === 'CLASS' ? 'class_id' : 'club_id';
  return (await owner.query(`select count(*)::int n from public.${table} where user_id=$1 and ${column}=$2 and active`, [actor.id, entity])).rows[0].n;
}
async function actorTransaction(actor) {
  const client = await connect('donuts-policy-holder');
  await client.query('begin');
  await client.query('set local role authenticated');
  await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: actor.id, email: actor.email, role: 'authenticated' })]);
  return client;
}
async function waitForAdvisory(name) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const result = await owner.query("select count(*)::int n from pg_stat_activity where application_name=$1 and wait_event='advisory'", [name]);
    if (result.rows[0].n > 0) return;
    await nap(20);
  }
  throw new Error('Concurrent request never reached the advisory-lock barrier');
}

try {
  mkdirSync(`${root}/socket`, { recursive: true, mode: 0o700 });
  const initialized = execFileSync(initdb, ['-D', `${root}/postgres`, '-U', config.user, '-A', 'trust', '--no-locale', '-E', 'UTF8'], { encoding: 'utf8' });
  writeFileSync(`${root}/embedded-initdb.log`, initialized);
  execFileSync(pg_ctl, ['-D', `${root}/postgres`, '-l', `${root}/postgres.log`, '-o', `-k ${root}/socket -p ${config.port} -c listen_addresses=''`, '-w', 'start'], { encoding: 'utf8' });
  started = true;
  owner = await connect('donuts-policy-owner');
  report.databaseVersion = (await owner.query('select version()')).rows[0].version;
  await owner.query(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    grant usage on schema public, auth to anon, authenticated, service_role;
    create table auth.users (
      id uuid primary key, email text unique, email_confirmed_at timestamptz,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
    $$;
    create function auth.uid() returns uuid language sql stable as $$
      select (auth.jwt()->>'sub')::uuid
    $$;
    create table public.admin_emails(email text primary key);
    alter table public.admin_emails enable row level security;
    insert into public.admin_emails values('admin@donuts.test');
    create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
      select exists(select 1 from public.admin_emails a where lower(a.email)=lower(coalesce(auth.jwt()->>'email','')))
    $$;
    grant execute on function public.is_admin() to anon,authenticated;
    create table public.retained_content_probe(id integer primary key, payload jsonb not null);
    insert into public.retained_content_probe values(1,'{"schedule":"preserve","series":"preserve"}');
  `);
  await owner.query(readFileSync(`${repo}/supabase/migrations/0024_membership_foundation.sql`, 'utf8'));
  console.log('PASS unchanged migration 0024 applies to isolated Supabase-compatible auth scaffold');
  ids.schoolA = randomUUID(); ids.schoolB = randomUUID();
  ids.classA = randomUUID(); ids.classB = randomUUID(); ids.classC = randomUUID();
  ids.clubA = randomUUID(); ids.clubB = randomUUID();
  await owner.query('insert into public.schools(id,name) values($1,$2),($3,$4)', [ids.schoolA, 'Fixture School A', ids.schoolB, 'Fixture School B']);
  await owner.query("insert into public.classes(id,name,place,weekday,start_time) values($1,'Fixture Class A','Fixture venue',1,'19:00'),($2,'Fixture Class B','Fixture venue',3,'19:00'),($3,'Fixture Class C','Fixture venue',5,'19:00')", [ids.classA, ids.classB, ids.classC]);
  await owner.query("insert into public.clubs(id,name,school_id) values($1,'Fixture Club A',$2),($3,'Fixture Club B',$4)", [ids.clubA, ids.schoolA, ids.clubB, ids.schoolB]);
  await owner.query("update public.membership_settings set signup_open=true,consent_version='v1',privacy_url='https://donuts.test/privacy'");
  actors.admin = { id: randomUUID(), email: 'admin@donuts.test' };
  await owner.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [actors.admin.id, actors.admin.email]);
  for (const name of ['classLeader', 'clubLeader', 'dualLeader', 'lastLeader', 'replacement', 'outsider', 'member']) await fixture(name);
  await fixture('legacyPending', 'PENDING');
  await fixture('legacyApproved');
  await fixture('legacyRejected', 'PENDING');
  await fixture('suspended', 'SUSPENDED');
  await fixture('withdrawn', 'WITHDRAWN');
  await fixture('unverified', 'PENDING', false);
  await owner.query('insert into public.class_leaders(class_id,user_id,assigned_by) values($1,$2,$7),($3,$4,$7),($5,$6,$7)', [ids.classA, actors.classLeader.id, ids.classB, actors.dualLeader.id, ids.classC, actors.lastLeader.id, actors.admin.id]);
  await owner.query('insert into public.club_leaders(club_id,user_id,assigned_by) values($1,$2,$5),($3,$4,$5)', [ids.clubA, actors.clubLeader.id, ids.clubB, actors.dualLeader.id, actors.admin.id]);
  for (const [name, state] of [['legacyPending', 'PENDING'], ['legacyApproved', 'APPROVED'], ['legacyRejected', 'REJECTED']]) {
    await owner.query('insert into public.signup_requests(user_id,requested_school_id,requested_class_id,requested_club_id,status,consent_version,privacy_url,decided_by,decided_at,decision_reason) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [actors[name].id, ids.schoolA, ids.classA, ids.clubA, state, 'v1', 'https://donuts.test/privacy', state === 'PENDING' ? null : actors.admin.id, state === 'PENDING' ? null : new Date(), state === 'REJECTED' ? 'Fixture rejection' : null]);
  }
  await owner.query('insert into public.class_memberships(class_id,user_id) values($1,$2)', [ids.classA, actors.legacyApproved.id]);
  await owner.query('insert into public.club_memberships(club_id,user_id) values($1,$2)', [ids.clubA, actors.legacyApproved.id]);
  const before = {
    requests: (await owner.query('select * from public.signup_requests order by id')).rows,
    classes: (await owner.query('select * from public.class_memberships order by class_id,user_id')).rows,
    clubs: (await owner.query('select * from public.club_memberships order by club_id,user_id')).rows,
    content: (await owner.query('select * from public.retained_content_probe')).rows,
  };
  await owner.query(readFileSync(`${repo}/supabase/migrations/0025_independent_affiliations.sql`, 'utf8'));
  console.log('PASS new migration 0025 applies without SQL errors');

  await check('Original signup consent and decision snapshots remain unchanged', async () => assert.deepEqual((await owner.query('select * from public.signup_requests order by id')).rows, before.requests));
  await check('Existing class and club memberships remain unchanged', async () => {
    assert.deepEqual((await owner.query('select * from public.class_memberships order by class_id,user_id')).rows, before.classes);
    assert.deepEqual((await owner.query('select * from public.club_memberships order by club_id,user_id')).rows, before.clubs);
  });
  await check('Unrelated retained-content sentinel remains unchanged', async () => assert.deepEqual((await owner.query('select * from public.retained_content_probe')).rows, before.content));
  await check('Legacy requests split into class and club records with identical decisions', async () => {
    for (const [name, state] of [['legacyPending', 'PENDING'], ['legacyApproved', 'APPROVED'], ['legacyRejected', 'REJECTED']]) {
      const rows = (await owner.query('select kind,status from public.affiliation_requests where user_id=$1 order by kind', [actors[name].id])).rows;
      assert.deepEqual(rows, [{ kind: 'CLASS', status: state }, { kind: 'CLUB', status: state }]);
    }
  });
  await check('Verified pending and rejected applicants become regular members without affiliations', async () => {
    for (const name of ['legacyPending', 'legacyRejected']) {
      assert.equal(await statusOf(actors[name]), 'ACTIVE');
      assert.equal(await activeMembership(actors[name], 'CLASS', ids.classA), 0);
      assert.equal(await activeMembership(actors[name], 'CLUB', ids.clubA), 0);
    }
  });
  await check('Migration does not activate suspended, withdrawn or unverified members', async () => {
    assert.equal(await statusOf(actors.suspended), 'SUSPENDED');
    assert.equal(await statusOf(actors.withdrawn), 'WITHDRAWN');
    assert.equal(await statusOf(actors.unverified), 'PENDING');
  });
  await check('Administrator authority does not require a member profile', async () => {
    assert.equal((await as(actors.admin, 'select public.is_admin() admin')).rows[0].admin, true);
    assert.equal((await owner.query('select count(*)::int n from public.member_profiles where id=$1', [actors.admin.id])).rows[0].n, 0);
    assert.equal((await as(actors.admin, 'select count(*)::int n from public.affiliation_requests')).rows[0].n, 6);
  });
  await check('Anonymous clients cannot read applications or mutate membership', async () => {
    await rejected(() => as(null, 'select * from public.affiliation_requests'), '42501');
    await rejected(() => as(null, 'select public.request_affiliation($1,$2)', ['CLASS', ids.classA]), '42501');
  });
  await check('Members cannot directly update profiles, roles, memberships, requests or audit data', async () => {
    for (const sql of ["update public.member_profiles set status='ACTIVE'", 'delete from public.class_leaders', 'delete from public.club_leaders', 'delete from public.class_memberships', 'delete from public.club_memberships', "update public.affiliation_requests set status='APPROVED'", 'delete from public.membership_audit_log']) await rejected(() => as(actors.member, sql), '42501');
  });
  await check('Private signup/auth helpers and retired combined approval cannot be invoked by members', async () => {
    await rejected(() => as(actors.member, 'select public.create_membership_application($1,$2)', [actors.member.id, '{}']), '42501');
    await rejected(() => as(actors.member, 'select public.resolve_member_login_email($1)', ['fixture_1']), '42501');
    await rejected(() => as(actors.admin, 'select public.review_signup_request($1,$2,$3)', [randomUUID(), 'APPROVED', null]), '42501');
  });
  await check('Leaders can see only their scoped request kind and unrelated members see none', async () => {
    const a = (await as(actors.classLeader, 'select kind,class_id from public.affiliation_requests')).rows;
    assert.ok(a.length > 0 && a.every(row => row.kind === 'CLASS' && row.class_id === ids.classA));
    const b = (await as(actors.clubLeader, 'select kind,club_id from public.affiliation_requests')).rows;
    assert.ok(b.length > 0 && b.every(row => row.kind === 'CLUB' && row.club_id === ids.clubA));
    assert.equal((await as(actors.outsider, 'select * from public.affiliation_requests')).rowCount, 0);
    assert.equal((await as(actors.classLeader, 'select * from public.signup_requests')).rowCount, 0);
  });
  const pendingRows = (await owner.query("select id,kind from public.affiliation_requests where user_id=$1 and status='PENDING'", [actors.legacyPending.id])).rows;
  const initialClass = pendingRows.find(row => row.kind === 'CLASS').id;
  const initialClub = pendingRows.find(row => row.kind === 'CLUB').id;
  await check('Class leaders cannot approve club requests and club leaders cannot approve class requests', async () => {
    await rejected(() => review(actors.classLeader, initialClub), 'forbidden');
    await rejected(() => review(actors.clubLeader, initialClass), 'forbidden');
  });
  await check('Approving a class leaves club pending and preserves school and member status', async () => {
    await review(actors.classLeader, initialClass);
    assert.equal(await activeMembership(actors.legacyPending, 'CLASS', ids.classA), 1);
    assert.equal(await activeMembership(actors.legacyPending, 'CLUB', ids.clubA), 0);
    const row = (await owner.query('select school_id,status from public.member_profiles where id=$1', [actors.legacyPending.id])).rows[0];
    assert.deepEqual(row, { school_id: ids.schoolA, status: 'ACTIVE' });
    assert.equal((await owner.query('select status from public.affiliation_requests where id=$1', [initialClub])).rows[0].status, 'PENDING');
  });
  await check('Independent club approval adds only the club membership', async () => {
    await review(actors.clubLeader, initialClub);
    assert.equal(await activeMembership(actors.legacyPending, 'CLUB', ids.clubA), 1);
    assert.equal(await activeMembership(actors.legacyPending, 'CLASS', ids.classA), 1);
  });
  await check('Multiple classes and cross-school clubs can be approved without removing existing affiliations', async () => {
    const classRequest = await request(actors.legacyPending, 'CLASS', ids.classB);
    const clubRequest = await request(actors.legacyPending, 'CLUB', ids.clubB);
    await review(actors.dualLeader, classRequest);
    await review(actors.dualLeader, clubRequest);
    for (const [kind, entity] of [['CLASS', ids.classA], ['CLASS', ids.classB], ['CLUB', ids.clubA], ['CLUB', ids.clubB]]) assert.equal(await activeMembership(actors.legacyPending, kind, entity), 1);
    assert.equal((await owner.query('select school_id from public.member_profiles where id=$1', [actors.legacyPending.id])).rows[0].school_id, ids.schoolA);
  });
  await check('Rejection preserves regular membership and permits a new independent application', async () => {
    const first = await request(actors.member, 'CLASS', ids.classA);
    await review(actors.classLeader, first, 'REJECTED', 'Fixture reason');
    assert.equal(await statusOf(actors.member), 'ACTIVE');
    assert.equal(await activeMembership(actors.member, 'CLASS', ids.classA), 0);
    const second = await request(actors.member, 'CLASS', ids.classA);
    assert.notEqual(first, second);
    assert.equal((await owner.query('select status from public.affiliation_requests where id=$1', [first])).rows[0].status, 'REJECTED');
    ids.memberClassRequest = second;
  });
  await check('Unverified, suspended and withdrawn members cannot apply or receive approval', async () => {
    for (const name of ['unverified', 'suspended', 'withdrawn']) await rejected(() => request(actors[name], 'CLASS', ids.classA), 'member_status_blocked');
    const id = (await owner.query("insert into public.affiliation_requests(user_id,kind,class_id) values($1,'CLASS',$2) returning id", [actors.unverified.id, ids.classA])).rows[0].id;
    await rejected(() => review(actors.admin, id), 'email_not_verified');
  });
  await check('A non-admin leader cannot approve their own application', async () => {
    const id = await request(actors.classLeader, 'CLASS', ids.classA);
    await rejected(() => review(actors.classLeader, id), 'self_approval_forbidden');
  });
  await check('Invalid entity/kind, inactive class and empty rejection reason are rejected', async () => {
    await rejected(() => request(actors.member, 'CLASS', randomUUID()), 'invalid_class');
    await rejected(() => request(actors.member, 'OTHER', ids.classA), 'invalid_affiliation_kind');
    await owner.query('update public.classes set active=false where id=$1', [ids.classC]);
    try { await rejected(() => request(actors.member, 'CLASS', ids.classC), 'invalid_class'); }
    finally { await owner.query('update public.classes set active=true where id=$1', [ids.classC]); }
    await rejected(() => review(actors.classLeader, ids.memberClassRequest, 'REJECTED', ''), 'invalid_decision');
  });
  await check('Eight concurrent applications collapse to one pending request', async () => {
    const values = await Promise.all(Array.from({ length: 8 }, () => request(actors.outsider, 'CLASS', ids.classB)));
    assert.equal(new Set(values).size, 1);
    ids.concurrentRequest = values[0];
    assert.equal((await owner.query("select count(*)::int n from public.affiliation_requests where user_id=$1 and class_id=$2 and status='PENDING'", [actors.outsider.id, ids.classB])).rows[0].n, 1);
  });
  await check('Eight concurrent identical approvals create one affiliation and one approval audit', async () => {
    await Promise.all(Array.from({ length: 8 }, () => review(actors.dualLeader, ids.concurrentRequest)));
    assert.equal(await activeMembership(actors.outsider, 'CLASS', ids.classB), 1);
    assert.equal((await owner.query("select count(*)::int n from public.membership_audit_log where affiliation_request_id=$1 and action='AFFILIATION_APPROVED'", [ids.concurrentRequest])).rows[0].n, 1);
    await rejected(() => request(actors.outsider, 'CLASS', ids.classB), 'already_affiliated');
  });
  await check('Concurrent opposing decisions permit exactly one outcome with matching membership state', async () => {
    const actor = await fixture('opposing');
    const id = await request(actor, 'CLASS', ids.classC);
    const results = await Promise.allSettled([review(actors.admin, id), review(actors.admin, id, 'REJECTED', 'Fixture rejection')]);
    assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
    const failed = results.find(value => value.status === 'rejected');
    assert.equal(failed.reason.message, 'already_reviewed');
    const outcome = (await owner.query('select status from public.affiliation_requests where id=$1', [id])).rows[0].status;
    assert.equal(await activeMembership(actor, 'CLASS', ids.classC), outcome === 'APPROVED' ? 1 : 0);
  });
  await check('Normal removal of the last leader is blocked; inactive replacement cannot be assigned', async () => {
    await rejected(() => as(actors.admin, 'select public.remove_membership_leader($1,$2,$3)', ['CLASS', ids.classC, actors.lastLeader.id]), 'last_leader_requires_replacement');
    await rejected(() => as(actors.admin, 'select public.assign_membership_leader($1,$2,$3)', ['CLASS', ids.classC, actors.suspended.id]), 'member_status_blocked');
  });
  await check('Non-admin cannot suspend members or assign/remove leaders', async () => {
    await rejected(() => as(actors.classLeader, 'select public.set_member_suspension($1,true,$2)', [actors.member.id, 'Fixture']), 'forbidden');
    await rejected(() => as(actors.classLeader, 'select public.assign_membership_leader($1,$2,$3)', ['CLASS', ids.classA, actors.member.id]), 'forbidden');
    await rejected(() => as(actors.classLeader, 'select public.remove_membership_leader($1,$2,$3)', ['CLASS', ids.classA, actors.classLeader.id]), 'forbidden');
  });
  await check('Queued approval is denied after concurrent leader revocation commits', async () => {
    await as(actors.admin, 'select public.assign_membership_leader($1,$2,$3)', ['CLASS', ids.classA, actors.replacement.id]);
    const holder = await actorTransaction(actors.admin);
    let queued;
    try {
      await holder.query('select public.remove_membership_leader($1,$2,$3)', ['CLASS', ids.classA, actors.classLeader.id]);
      queued = as(actors.classLeader, 'select public.review_affiliation_request($1,$2,$3)', [ids.memberClassRequest, 'APPROVED', null], 'donuts-queued-revoked').then(() => ({ succeeded: true }), error => ({ error }));
      await waitForAdvisory('donuts-queued-revoked');
      await holder.query('commit');
      const result = await queued;
      assert.equal(result.error?.message, 'forbidden');
      assert.equal(await activeMembership(actors.member, 'CLASS', ids.classA), 0);
    } finally { await holder.query('rollback'); await holder.end(); if (queued) await queued; }
  });
  await check('Suspending the final leader removes assignments but preserves the class', async () => {
    await as(actors.admin, 'select public.set_member_suspension($1,true,$2)', [actors.lastLeader.id, 'Fixture suspension']);
    assert.equal(await statusOf(actors.lastLeader), 'SUSPENDED');
    assert.equal((await owner.query('select count(*)::int n from public.class_leaders where class_id=$1', [ids.classC])).rows[0].n, 0);
    assert.equal((await owner.query('select active from public.classes where id=$1', [ids.classC])).rows[0].active, true);
  });
  await check('Suspension preserves all affiliations and restoration never resurrects leadership', async () => {
    await as(actors.admin, 'select public.assign_membership_leader($1,$2,$3)', ['CLUB', ids.clubB, actors.legacyPending.id]);
    await as(actors.admin, 'select public.set_member_suspension($1,true,$2)', [actors.legacyPending.id, 'Fixture suspension']);
    assert.equal((await as(actors.legacyPending, 'select public.is_active_member() active')).rows[0].active, false);
    for (const [kind, entity] of [['CLASS', ids.classA], ['CLASS', ids.classB], ['CLUB', ids.clubA], ['CLUB', ids.clubB]]) assert.equal(await activeMembership(actors.legacyPending, kind, entity), 1);
    await as(actors.admin, 'select public.set_member_suspension($1,false,$2)', [actors.legacyPending.id, 'Fixture restoration']);
    assert.equal(await statusOf(actors.legacyPending), 'ACTIVE');
    assert.equal((await owner.query('select count(*)::int n from public.club_leaders where user_id=$1', [actors.legacyPending.id])).rows[0].n, 0);
    assert.equal((await as(actors.legacyPending, 'select public.can_review_affiliation($1,$2) allowed', ['CLUB', ids.clubB])).rows[0].allowed, false);
  });
  await check('Reverification does not restore suspended or withdrawn memberships', async () => {
    for (const actor of [actors.suspended, actors.withdrawn]) {
      const beforeStatus = await statusOf(actor);
      await owner.query('update auth.users set email_confirmed_at=null where id=$1', [actor.id]);
      await owner.query('update auth.users set email_confirmed_at=now() where id=$1', [actor.id]);
      assert.equal(await statusOf(actor), beforeStatus);
    }
  });
  await check('Withdrawn accounts cannot be restored through the suspension RPC', async () => rejected(() => as(actors.admin, 'select public.set_member_suspension($1,false,$2)', [actors.withdrawn.id, 'Fixture']), 'member_status_blocked'));
  await check('New signup accepts cross-school club without trusting status or role metadata', async () => {
    const actor = { id: randomUUID(), email: 'new-signup@donuts.test' };
    const payload = { username: 'new_signup', name: 'Signup fixture', phone: '01000000000', school_id: ids.schoolA, class_id: ids.classA, club_id: ids.clubB, consent: true, consent_version: 'v1', status: 'ACTIVE', role: 'ADMIN', is_admin: true };
    await owner.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [actor.id, actor.email, JSON.stringify({ donuts_membership: payload, role: 'ADMIN' })]);
    actors.signup = actor;
    assert.equal(await statusOf(actor), 'PENDING');
    assert.equal((await as(actor, 'select public.is_admin() admin')).rows[0].admin, false);
    assert.equal((await owner.query('select count(*)::int n from public.affiliation_requests where user_id=$1', [actor.id])).rows[0].n, 2);
  });
  await check('Email confirmation atomically activates a new member without approving either affiliation', async () => {
    await owner.query('update auth.users set email_confirmed_at=now() where id=$1', [actors.signup.id]);
    assert.equal(await statusOf(actors.signup), 'ACTIVE');
    assert.equal((await as(actors.signup, 'select public.is_active_member() active')).rows[0].active, true);
    assert.equal(await activeMembership(actors.signup, 'CLASS', ids.classA), 0);
    assert.equal(await activeMembership(actors.signup, 'CLUB', ids.clubB), 0);
    assert.equal((await owner.query("select count(*)::int n from public.membership_audit_log where user_id=$1 and action='EMAIL_VERIFIED_MEMBER_ACTIVATED'", [actors.signup.id])).rows[0].n, 1);
  });
  await check('Signup with no class or stale consent rolls back the auth identity and profile', async () => {
    for (const invalid of ['class', 'consent']) {
      const id = randomUUID();
      const payload = { username: `bad_${invalid}`, name: 'Invalid fixture', phone: '01000000000', school_id: ids.schoolA, class_id: invalid === 'class' ? null : ids.classA, club_id: null, consent: true, consent_version: invalid === 'consent' ? 'outdated' : 'v1' };
      await rejected(() => owner.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [id, `${invalid}@donuts.test`, JSON.stringify({ donuts_membership: payload })]), invalid === 'class' ? 'invalid_class' : 'terms_changed');
      assert.equal((await owner.query('select count(*)::int n from auth.users where id=$1', [id])).rows[0].n, 0);
      assert.equal((await owner.query('select count(*)::int n from public.member_profiles where id=$1', [id])).rows[0].n, 0);
    }
  });
  await check('Approval and suspension audits record actors, reasons and revoked assignment IDs', async () => {
    const row = (await owner.query("select actor_id,details from public.membership_audit_log where user_id=$1 and action='MEMBER_SUSPENDED'", [actors.lastLeader.id])).rows[0];
    assert.equal(row.actor_id, actors.admin.id);
    assert.equal(row.details.before, 'ACTIVE');
    assert.equal(row.details.after, 'SUSPENDED');
    assert.equal(row.details.reason, 'Fixture suspension');
    assert.ok(row.details.revoked_classes.includes(ids.classC));
  });
  await check('Application and audit tables have RLS enabled with no authenticated write grant', async () => {
    const rows = (await owner.query("select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname in ('affiliation_requests','member_profiles','membership_audit_log')")).rows;
    assert.equal(rows.length, 3);
    assert.ok(rows.every(row => row.relrowsecurity));
    const row = (await owner.query("select has_table_privilege('authenticated','public.affiliation_requests','INSERT') can_insert,has_table_privilege('authenticated','public.affiliation_requests','UPDATE') can_update")).rows[0];
    assert.deepEqual(row, { can_insert: false, can_update: false });
  });
  await owner.query(readFileSync(repo + '/supabase/migrations/0026_class_club_operations.sql','utf8'));
  console.log('PASS migration 0026 applies to the validated membership foundation');
  const opLeader = await fixture('opLeader');
  const opMember = await fixture('opMember');
  const opLate = await fixture('opLate');
  const opOutsider = await fixture('opOutsider');
  const makeClass = async (name, count=2, leader=opLeader.id) => (await as(actors.admin,
    'select public.save_operating_entity($1,$2,$3,$4) id',
    ['CLASS', null, null, {name,place:'Fixture venue',weekday:4,start_time:'19:00',active:true,
      leader_ids:[leader],session_times:Array.from({length:count},(_,i)=>new Date(Date.UTC(2026,8,10+i*7,10)).toISOString())}])).rows[0].id;
  const opClass=await makeClass('Operations class',3);
  const sessions=async id=>(await owner.query('select * from public.class_sessions where class_id=$1 order by session_number',[id])).rows;
  const sessionState=async id=>(await owner.query('select * from public.class_sessions where id=$1',[id])).rows[0];
  const act=async (actor,id,action,reason=null,marks=null,user=null,revision=null)=>{
    const s=await sessionState(id);
    return as(actor,'select public.change_class_session($1,$2,$3,$4,$5,$6)',[id,revision??s.revision,action,reason,marks,user]);
  };
  const affiliate=async (actor,id)=>review(actors.admin,await request(actor,'CLASS',id));
  const xp=async (actor,id)=>(await owner.query('select coalesce(sum(delta),0)::int n from public.xp_ledger where user_id=$1 and session_id=$2',[actor.id,id])).rows[0].n;
  const roster=async id=>{const s=await sessionState(id);return (await owner.query('select * from public.class_attendance where session_id=$1 and roster_run=$2 order by user_id',[id,s.roster_run])).rows;};
  const ss=await sessions(opClass), first=ss[0].id, second=ss[1].id, third=ss[2].id;
  await check('Classes have no arbitrary twelve-session ceiling',async()=>{
    const id=await makeClass('Fourteen sessions',14,actors.admin.id);
    assert.equal((await sessions(id)).length,14);
    assert.equal((await owner.query('select count(*)::int n from public.class_memberships where class_id=$1',[id])).rows[0].n,0);
  });
  await check('Creation requires a leader and at least one real session',async()=>{
    const payload={name:'Invalid',place:'Fixture',weekday:1,start_time:'19:00',active:true,leader_ids:[],session_times:['2026-09-10T10:00:00Z']};
    await assert.rejects(as(actors.admin,'select public.save_operating_entity($1,$2,$3,$4)',['CLASS',null,null,payload]));
    payload.leader_ids=[opLeader.id];payload.session_times=[];
    await assert.rejects(as(actors.admin,'select public.save_operating_entity($1,$2,$3,$4)',['CLASS',null,null,payload]));
  });
  await check('Catalog, attendance, ledger and internal helper direct writes are denied',async()=>{
    await rejected(()=>as(actors.admin,"update public.classes set name='Bypass' where id=$1",[opClass]),'42501');
    await rejected(()=>as(opMember,'delete from public.xp_ledger'),'42501');
    await rejected(()=>as(actors.admin,'select public.close_resolved_class($1)',[opClass]),'42501');
    await rejected(()=>as(opMember,'update public.class_attendance set mark=$1',['PRESENT']),'42501');
  });
  await check('Scopes hide sessions and prevent unauthorized operators',async()=>{
    assert.equal((await as(opOutsider,'select * from public.class_sessions where class_id=$1',[opClass])).rowCount,0);
    await assert.rejects(act(opOutsider,first,'START'));
    await rejected(()=>as(null,'select * from public.class_sessions'),'42501');
  });
  await affiliate(opMember,opClass);
  await check('Start snapshots approved members, not leaders or later approvals',async()=>{
    await act(opLeader,first,'START');
    assert.deepEqual((await roster(first)).map(r=>r.user_id),[opMember.id]);
    assert.equal((await roster(first))[0].mark,'UNCONFIRMED');
    await affiliate(opLate,opClass);
    assert.equal((await roster(first)).length,1);
  });
  await check('Reverting and restarting preserves the earlier roster run',async()=>{
    await act(opLeader,first,'REVERT_START','Accidental start');
    await act(opLeader,first,'START');
    assert.equal((await sessionState(first)).roster_run,2);
    assert.equal((await roster(first)).length,2);
    assert.equal((await owner.query('select count(*)::int n from public.class_attendance where session_id=$1 and roster_run=1',[first])).rows[0].n,1);
  });
  await check('Unconfirmed attendance cannot lock; full roster keys and revisions are mandatory',async()=>{
    await assert.rejects(act(opLeader,first,'LOCK'));
    await assert.rejects(act(opLeader,first,'SAVE_ATTENDANCE',null,{[opMember.id]:'PRESENT'}));
    await assert.rejects(act(opLeader,first,'SAVE_ATTENDANCE',null,{[opMember.id]:'PRESENT',[opLate.id]:'ABSENT'},null,1));
    await act(opLeader,first,'SAVE_ATTENDANCE',null,{[opMember.id]:'PRESENT',[opLate.id]:'UNCONFIRMED'});
    await assert.rejects(act(opLeader,first,'REVERT_START','Invalid revert'));
    await act(opLeader,first,'MISSING_AS_ABSENT');
    const rows=await roster(first);
    assert.equal(rows.find(r=>r.user_id===opMember.id).mark,'PRESENT');
    assert.equal(rows.find(r=>r.user_id===opLate.id).mark,'ABSENT');
  });
  await check('Lock alone awards no XP; completing awards exactly one hundred',async()=>{
    await act(opLeader,first,'LOCK');assert.equal(await xp(opMember,first),0);
    await act(opLeader,first,'COMPLETE');assert.equal(await xp(opMember,first),100);
    assert.equal(await xp(opLate,first),0);
    await assert.rejects(act(opLeader,first,'COMPLETE','Duplicate completion'));
    assert.equal(await xp(opMember,first),100);
  });
  await check('Completed attendance correction retains XP until relocking, then reconciles',async()=>{
    await act(opLeader,first,'UNLOCK','Correct attendance');assert.equal(await xp(opMember,first),100);
    await act(opLeader,first,'SAVE_ATTENDANCE','Correct attendance',{[opMember.id]:'ABSENT',[opLate.id]:'PRESENT'});
    assert.equal(await xp(opMember,first),100);
    await act(opLeader,first,'LOCK','Confirm correction');
    assert.equal(await xp(opMember,first),0);assert.equal(await xp(opLate,first),100);
    await act(opLeader,first,'UNLOCK','No change');await act(opLeader,first,'LOCK','No change');
    assert.equal(await xp(opLate,first),100);
  });
  await check('Cancelling reverses effective credit and restoration restores only eligible credit',async()=>{
    await act(opLeader,first,'CANCEL','Cancelled meeting');assert.equal(await xp(opLate,first),0);
    await act(opLeader,first,'RESTORE_CANCEL','Wrong cancellation');assert.equal(await xp(opLate,first),100);
  });
  await check('Future reschedule requires exact current target revision map',async()=>{
    const all=await sessions(opClass);
    const expected=Object.fromEntries(all.slice(1).map(s=>[s.id,s.revision]));
    await assert.rejects(as(opLeader,'select public.reschedule_class_sessions($1,$2,$3,$4,$5)',[second,'2026-09-18T10:00:00Z',true,{[second]:expected[second]},'Incomplete preview']));
    await as(opLeader,'select public.reschedule_class_sessions($1,$2,$3,$4,$5)',[second,'2026-09-18T10:00:00Z',true,expected,'Move future']);
    assert.equal(new Date((await sessionState(third)).scheduled_at).toISOString(),'2026-09-25T10:00:00.000Z');
    await assert.rejects(as(opLeader,'select public.reschedule_class_sessions($1,$2,$3,$4,$5)',[second,'2026-09-19T10:00:00Z',true,expected,'Stale preview']));
  });
  await check('Only administrators can move running or completed sessions',async()=>{
    const s=await sessionState(first), expected={[first]:s.revision};
    await assert.rejects(as(opLeader,'select public.reschedule_class_sessions($1,$2,$3,$4,$5)',[first,'2026-09-11T10:00:00Z',false,expected,'History correction']));
    await as(actors.admin,'select public.reschedule_class_sessions($1,$2,$3,$4,$5)',[first,'2026-09-11T10:00:00Z',false,expected,'History correction']);
  });
  await check('Concurrent requests with the same revision cannot both win',async()=>{
    const revision=(await sessionState(second)).revision;
    const results=await Promise.allSettled([act(opLeader,second,'START',null,null,null,revision),act(opLeader,second,'START',null,null,null,revision)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await sessionState(second)).roster_run,1);
  });
  await check('Late approved affiliates require explicit roster addition',async()=>{
    await affiliate(opOutsider,opClass);
    assert.equal((await roster(second)).length,2);
    await act(opLeader,second,'ADD_ATTENDEE','Late approved participant',null,opOutsider.id);
    assert.equal((await roster(second)).length,3);
    assert.equal((await roster(second)).find(r=>r.user_id===opOutsider.id).mark,'UNCONFIRMED');
  });
  await check('Class closes from resolved statuses and snapshots affiliates, not from calendar time',async()=>{
    assert.equal((await owner.query('select closed_at from public.classes where id=$1',[opClass])).rows[0].closed_at,null);
    await act(opLeader,second,'CANCEL','Cancelled');
    await act(opLeader,third,'CANCEL','Cancelled');
    const c=(await owner.query('select * from public.classes where id=$1',[opClass])).rows[0];
    assert.ok(c.closed_at);assert.ok(c.first_closed_at);assert.equal(c.active,false);
    assert.equal((await owner.query('select count(*)::int n from public.class_closure_members cm join public.class_closures c on c.id=cm.closure_id where c.class_id=$1',[opClass])).rows[0].n,3);
    await assert.rejects(as(actors.admin,'select public.add_class_session($1,$2,$3)',[opClass,c.revision,'2026-10-01T10:00:00Z']));
  });
  await check('Only an admin can recover an unfinished session after closure, without erasing closure history',async()=>{
    const before=(await owner.query('select first_closed_at from public.classes where id=$1',[opClass])).rows[0];
    await assert.rejects(act(opLeader,third,'RESTORE_CANCEL','Correction'));
    await act(actors.admin,third,'RESTORE_CANCEL','Correction');
    const after=(await owner.query('select * from public.classes where id=$1',[opClass])).rows[0];
    assert.equal(after.closed_at,null);assert.deepEqual(after.first_closed_at,before.first_closed_at);
    assert.equal(after.active,false);
    await act(opLeader,third,'CANCEL','Resolved again');
  });
  await check('Own XP/level history is readable but another member ledger is not',async()=>{
    const data=(await as(opLate,'select public.get_my_class_activity() data')).rows[0].data;
    assert.equal(data.total_xp,100);assert.equal(data.level,2);
    assert.equal((await as(opMember,'select * from public.xp_ledger where user_id=$1',[opLate.id])).rowCount,0);
  });
  await check('Last eligible leader removal is rejected',async()=>{
    await assert.rejects(as(actors.admin,'select public.remove_membership_leader($1,$2,$3)',['CLASS',opClass,opLeader.id]));
    await as(actors.admin,'select public.assign_membership_leader($1,$2,$3)',['CLASS',opClass,actors.admin.id]);
    await as(actors.admin,'select public.remove_membership_leader($1,$2,$3)',['CLASS',opClass,opLeader.id]);
  });
  await check('Archived entities are read-only and reject old affiliation request RPCs',async()=>{
    const c=(await owner.query('select * from public.classes where id=$1',[opClass])).rows[0];
    await as(actors.admin,'select public.retire_operating_entity($1,$2,$3,$4,$5)',['CLASS',opClass,c.revision,false,'Preserve history']);
    await assert.rejects(act(actors.admin,first,'UNLOCK','Archived'));
    await assert.rejects(request(opLeader,'CLASS',opClass));
    assert.equal(await xp(opLate,first),100);
  });
  await check('Unused entities can be deleted but used entities cannot',async()=>{
    const unused=await makeClass('Unused');
    const c=(await owner.query('select * from public.classes where id=$1',[unused])).rows[0];
    await as(actors.admin,'select public.retire_operating_entity($1,$2,$3,$4,$5)',['CLASS',unused,c.revision,true,'Created in error']);
    assert.equal((await owner.query('select * from public.classes where id=$1',[unused])).rowCount,0);
    assert.ok((await owner.query('select * from public.entity_operation_log where entity_id=$1',[unused])).rowCount>0);
    await assert.rejects(as(actors.admin,'select public.retire_operating_entity($1,$2,$3,$4,$5)',['CLASS',opClass,c.revision,true,'Used entity']));
  });
  await check('Leader authorization is rechecked after the transaction lock',async()=>{
    const id=await makeClass('Revocation race'), s=(await sessions(id))[0];
    const holder=await connect('revocation-holder');
    await holder.query('begin');
    await holder.query("select pg_advisory_xact_lock(hashtextextended('donuts:membership-write',25))");
    let pending;
    try {
      pending=as(opLeader,'select public.change_class_session($1,$2,$3,$4,$5,$6)',[s.id,s.revision,'START',null,null,null],'revoked-leader').then(()=>({ok:true}),error=>({ok:false,error:error.message}));
      await waitForAdvisory('revoked-leader');
      await holder.query('delete from public.class_leaders where class_id=$1 and user_id=$2',[id,opLeader.id]);
      await holder.query('commit');
      assert.equal((await pending).ok,false);
      assert.equal((await sessionState(s.id)).status,'SCHEDULED');
    } finally {await holder.query('rollback');await holder.end();if(pending)await pending;}
  });
  await owner.query(readFileSync(repo+'/supabase/migrations/0027_successors_notifications.sql','utf8'));

  await owner.query(readFileSync(repo+'/supabase/migrations/0028_club_meetings.sql','utf8'));
  await owner.query(readFileSync(repo+'/supabase/migrations/0029_reviewed_daily_learning.sql','utf8'));
  const successor = await makeClass('Successor automatic');
  const succession=(await as(actors.admin,'select public.create_class_succession($1,$2,$3) id',[opClass,successor,'AUTO_ENROLL'])).rows[0].id;
  const preview=async id=>(await as(actors.admin,'select public.preview_class_succession($1) data',[id])).rows[0].data;
  await check('Successor preview excludes currently suspended or removed predecessor affiliates',async()=>{
    const before=await preview(succession);assert.equal(before.members.length,3);
    await owner.query("update public.member_profiles set status='SUSPENDED' where id=$1",[opOutsider.id]);
    await owner.query('update public.class_memberships set active=false where class_id=$1 and user_id=$2',[opClass,opMember.id]);
    await assert.rejects(as(actors.admin,'select public.execute_class_succession($1,$2,$3,$4)',[succession,before.fingerprint,true,'Proceed']));
    const after=await preview(succession);assert.deepEqual(after.members.map(m=>m.id),[opLate.id]);assert.equal(after.excluded_count,2);
  });
  await check('Automatic successor enrollment and notifications commit once, with administrator approval history',async()=>{
    const p=await preview(succession);
    await assert.rejects(as(actors.admin,'select public.execute_class_succession($1,$2,$3,$4)',[succession,p.fingerprint,false,'Proceed']));
    await as(actors.admin,'select public.execute_class_succession($1,$2,$3,$4)',[succession,p.fingerprint,true,'Proceed']);
    await as(actors.admin,'select public.execute_class_succession($1,$2,$3,$4)',[succession,p.fingerprint,true,'Retry']);
    assert.equal(await activeMembership(opLate,'CLASS',successor),1);
    assert.equal((await owner.query("select count(*)::int n from public.affiliation_requests where class_id=$1 and user_id=$2 and status='APPROVED'",[successor,opLate.id])).rows[0].n,1);
    assert.equal((await owner.query("select count(*)::int n from public.member_notifications where event_key=$1",['successor:'+succession+':'+opLate.id])).rows[0].n,1);
  });
  await check('Invitation successor does not enroll anyone or approve an application',async()=>{
    const target=await makeClass('Invitation target');
    const id=(await as(actors.admin,'select public.create_class_succession($1,$2) id',[opClass,target])).rows[0].id;
    const p=await preview(id);
    await as(actors.admin,'select public.execute_class_succession($1,$2,$3,$4)',[id,p.fingerprint,true,'Invite only']);
    assert.equal(await activeMembership(opLate,'CLASS',target),0);
    assert.equal((await owner.query('select count(*)::int n from public.affiliation_requests where class_id=$1',[target])).rows[0].n,0);
  });
  await check('Notifications are private, and queue leasing freezes payloads and retries safely',async()=>{
    assert.equal((await as(opMember,'select * from public.member_notifications where user_id=$1',[opLate.id])).rowCount,0);
    await rejected(()=>as(opLate,"select public.claim_notification_emails('team@donuts.test','https://donuts.test',10)"),'42501');
    const jobs=(await owner.query("select public.claim_notification_emails('team@donuts.test','https://donuts.test',10) data")).rows[0].data;
    assert.ok(jobs.length>=2);
    assert.equal((await owner.query("select public.claim_notification_emails('team@donuts.test','https://donuts.test',10) data")).rows[0].data.length,0);
    await owner.query('select public.finish_notification_email($1,$2,$3,$4,$5)',[jobs[0].id,jobs[0].lease_id,null,'Network timeout',true]);
    await owner.query("update public.notification_emails set available_at=clock_timestamp()-interval '1 second' where id=$1",[jobs[0].id]);
    const again=(await owner.query("select public.claim_notification_emails('changed@donuts.test','https://changed.test',10) data")).rows[0].data[0];
    assert.deepEqual(again.payload,jobs[0].payload);
    await owner.query('select public.finish_notification_email($1,$2,$3,$4,$5)',[again.id,again.lease_id,'resend-fixture-id',null,false]);
    assert.equal((await owner.query('select status from public.notification_emails where id=$1',[again.id])).rows[0].status,'SENT');
  });
  const meetingLeader=await fixture('meetingLeader'), meetingSecond=await fixture('meetingSecond'), a1=await fixture('meetingOne'),a2=await fixture('meetingTwo'),a3=await fixture('meetingThree'),a4=await fixture('meetingFour');
  const meetingClub=(await as(actors.admin,'select public.save_operating_entity($1,$2,$3,$4) id',['CLUB',null,null,{name:'Meeting Club',school_id:ids.schoolA,leader_ids:[meetingLeader.id,meetingSecond.id]}])).rows[0].id;
  for(const a of [a1,a2,a3,a4])await review(actors.admin,await request(a,'CLUB',meetingClub));
  const meetingPayload={club_id:meetingClub,title:'Fixture meeting',place:'Club room',scheduled_at:'2026-10-01T10:00:00Z',capacity:1,guest_allowed:false,signup_open:true,hold_hours:12,hot:false};
  const meeting=(await as(meetingLeader,'select public.save_club_meeting($1,$2,$3) id',[null,null,meetingPayload])).rows[0].id;
  const join=async a=>(await as(a,'select public.apply_club_meeting($1) id',[meeting])).rows[0].id;
  const app=async id=>(await owner.query('select * from public.meeting_applications where id=$1',[id])).rows[0];
  let ap1,ap2,ap3,ap4;
  await check('Club meeting ownership, HOT and membership are enforced on the server',async()=>{
    await assert.rejects(as(meetingSecond,'select public.save_club_meeting($1,$2,$3)',[meeting,1,{...meetingPayload,reason:'Other leader'}]));
    await assert.rejects(as(meetingLeader,'select public.save_club_meeting($1,$2,$3)',[meeting,1,{...meetingPayload,hot:true,reason:'Unauthorized HOT'}]));
    await assert.rejects(as(opMember,'select public.apply_club_meeting($1)',[meeting]));
    assert.equal((await owner.query('select count(*)::int n from public.club_memberships where club_id=$1 and user_id=$2',[meetingClub,meetingLeader.id])).rows[0].n,0);
  });
  await check('Full meetings produce FIFO waitlist entries without overbooking',async()=>{
    ap1=await join(a1);ap2=await join(a2);ap3=await join(a3);
    assert.equal((await app(ap1)).status,'CONFIRMED');assert.equal((await app(ap2)).status,'WAITLIST');assert.equal((await app(ap3)).status,'WAITLIST');
    assert.equal(await join(a2),ap2);
  });
  await check('Vacancy offers reserve seats, never auto-confirm, and cannot be bypassed',async()=>{
    await as(a1,'select public.respond_meeting_application($1,$2)',[ap1,'CANCEL']);
    const offered=await app(ap2);assert.equal(offered.status,'OFFERED');assert.equal((await app(ap3)).status,'WAITLIST');
    assert.equal(Math.round((new Date(offered.offer_expires_at)-new Date(offered.offered_at))/3600000),12);
    ap4=await join(a4);assert.equal((await app(ap4)).status,'WAITLIST');
    await as(a2,'select public.respond_meeting_application($1,$2)',[ap2,'CONFIRM']);
    assert.equal((await app(ap2)).status,'CONFIRMED');assert.equal((await app(ap3)).status,'WAITLIST');
  });
  await check('Expired offers end, move to the next waiter, and reapplications join the tail',async()=>{
    await as(a2,'select public.respond_meeting_application($1,$2)',[ap2,'CANCEL']);
    assert.equal((await app(ap3)).status,'OFFERED');
    await owner.query("update public.meeting_applications set offer_expires_at=clock_timestamp()-interval '1 second' where id=$1",[ap3]);
    const response=(await as(a3,'select public.respond_meeting_application($1,$2) status',[ap3,'CONFIRM'])).rows[0].status;
    assert.equal(response,'EXPIRED');assert.equal((await app(ap4)).status,'OFFERED');
    const next=await join(a3);assert.equal((await app(next)).status,'WAITLIST');assert.ok(Number((await app(next)).queue_number)>Number((await app(ap4)).queue_number));
  });
  await check('Closing signups preserves reservations; completing ends waits and history remains',async()=>{
    let m=(await owner.query('select * from public.club_meetings where id=$1',[meeting])).rows[0];
    await as(meetingLeader,'select public.save_club_meeting($1,$2,$3)',[meeting,m.revision,{...meetingPayload,signup_open:false,reason:'Close signup'}]);
    assert.equal((await app(ap4)).status,'OFFERED');await assert.rejects(join(a1));
    await as(a4,'select public.respond_meeting_application($1,$2)',[ap4,'CONFIRM']);
    m=(await owner.query('select * from public.club_meetings where id=$1',[meeting])).rows[0];
    await as(meetingLeader,'select public.close_club_meeting($1,$2,$3,$4)',[meeting,m.revision,'COMPLETED','Finished']);
    assert.equal((await app(ap4)).status,'CONFIRMED');
    assert.equal((await owner.query("select count(*)::int n from public.meeting_applications where meeting_id=$1 and status in ('OFFERED','WAITLIST')",[meeting])).rows[0].n,0);
    await assert.rejects(as(a4,'select public.respond_meeting_application($1,$2)',[ap4,'CANCEL']));
    await owner.query("update public.club_meetings set completed_at=clock_timestamp()-interval '24 hours 1 second' where id=$1",[meeting]);
    assert.equal((await as(opMember,'select * from public.club_meetings where id=$1',[meeting])).rowCount,0);
    assert.equal((await as(a4,'select * from public.club_meetings where id=$1',[meeting])).rowCount,1);
    await owner.query('select public.maintain_club_meetings()');
    assert.ok((await owner.query('select archived_at from public.club_meetings where id=$1',[meeting])).rows[0].archived_at);
    assert.equal((await owner.query("select count(*)::int n from public.xp_ledger where user_id=any($1::uuid[])",[[a1.id,a2.id,a3.id,a4.id]])).rows[0].n,0);
  });
  const learner=await fixture('learner'),wrongLearner=await fixture('wrongLearner'),learningVersions=[];
  const questionPayload={prompt:'Fixture original question',choices:[{id:'a',text:'Call'},{id:'b',text:'Fold'},{id:'c',text:'Raise'}],answer_mode:'SINGLE',correct_ids:['a'],explanation:'Fixture reviewed explanation',difficulty:'BEGINNER',kind:'GENERAL',authorship_confirmed:true,authorship_note:'Isolated test fixture, never published to production',ai_assisted:false};
  const qsave=async p=>(await as(actors.admin,'select public.save_learning_question($1,$2) id',[null,p])).rows[0].id;
  const qreview=async id=>as(actors.admin,'select public.review_learning_question($1,$2,$3,$4)',[id,true,{original:true,answer:true,explanation:true,gto:true},'Checked fixture']);
  await check('Question authoring enforces originality, answer modes and GTO evidence',async()=>{
    await assert.rejects(qsave({...questionPayload,authorship_confirmed:false}));
    await assert.rejects(qsave({...questionPayload,answer_mode:'MULTIPLE'}));
    await assert.rejects(qsave({...questionPayload,kind:'GTO'}));
    await assert.rejects(as(learner,'select public.save_learning_question($1,$2)',[null,questionPayload]));
  });
  for(let i=0;i<5;i++){const id=await qsave({...questionPayload,prompt:'Fixture original '+i,...(i===4?{answer_mode:'MULTIPLE',correct_ids:['a','c']}:{}),difficulty:i===3?'ADVANCED':'BEGINNER'});learningVersions.push(id);}
  const day=(await owner.query("select (clock_timestamp() at time zone 'Asia/Seoul')::date::text as learning_day")).rows[0].learning_day;
  await check('Unreviewed questions cannot be scheduled; the author can separately review with mandatory checklist',async()=>{
    await assert.rejects(as(actors.admin,'select public.schedule_daily_learning($1,$2)',[day,learningVersions]));
    await assert.rejects(as(actors.admin,'select public.review_learning_question($1,$2,$3,$4)',[learningVersions[0],true,{original:true},'Incomplete']));
    for(const id of learningVersions)await qreview(id);
    await as(actors.admin,'select public.schedule_daily_learning($1,$2)',[day,learningVersions]);
    await assert.rejects(qreview(learningVersions[0]));
    await assert.rejects(as(actors.admin,'select public.schedule_daily_learning($1,$2)',[day,learningVersions]));
  });
  let correctAnswers=Object.fromEntries(learningVersions.map((id,i)=>[id,i===4?['c','a']:['a']]));
  await check('Unsubmitted learners receive no answers or explanations through tables or daily RPC',async()=>{
    assert.equal((await as(learner,'select * from public.learning_question_versions')).rowCount,0);
    const daily=(await as(learner,'select public.get_daily_learning() data')).rows[0].data;
    assert.equal(daily.questions.length,5);assert.equal(daily.result,null);
    assert.ok(daily.questions.every(q=>!('correct_ids'in q)&&!('explanation'in q)));
    await assert.rejects(as(learner,'select public.submit_daily_learning($1,$2)',[day,{[learningVersions[0]]:['a']}]));
    assert.equal((await owner.query('select count(*)::int n from public.learning_attempts where user_id=$1',[learner.id])).rows[0].n,0);
  });
  let learned;
  await check('Server grading normalizes multi-select order and awards completion plus perfect bonus once',async()=>{
    const results=await Promise.all([as(learner,'select public.submit_daily_learning($1,$2) data',[day,correctAnswers]),as(learner,'select public.submit_daily_learning($1,$2) data',[day,correctAnswers])]);
    learned=results[0].rows[0].data;
    assert.equal(learned.correct_count,5);assert.equal(learned.xp,40);assert.equal(results[1].rows[0].data.id,learned.id);
    assert.equal((await owner.query('select sum(delta)::int n from public.xp_ledger where user_id=$1',[learner.id])).rows[0].n,40);
    assert.equal((await owner.query('select count(*)::int n from public.learning_answers where attempt_id=$1',[learned.id])).rows[0].n,5);
  });
  await check('Multi-answer grading uses exact sets; retries cannot improve first-attempt XP or accuracy',async()=>{
    const wrong={...correctAnswers,[learningVersions[4]]:['a']};
    const first=(await as(wrongLearner,'select public.submit_daily_learning($1,$2) data',[day,wrong])).rows[0].data;
    assert.equal(first.correct_count,4);assert.equal(first.xp,30);
    const retry=(await as(wrongLearner,'select public.submit_daily_learning($1,$2) data',[day,correctAnswers])).rows[0].data;
    assert.equal(retry.correct_count,4);
    const summary=(await as(wrongLearner,'select public.get_my_learning_summary() data')).rows[0].data;
    assert.equal(summary.current_streak,1);assert.equal(summary.completed_days,1);assert.equal(summary.correct,4);assert.equal(summary.total,5);assert.equal(summary.wrong_answers.length,1);
    await assert.rejects(as(wrongLearner,'select public.learning_attempt_result($1)',[learned.id]));
  });
  await check('Published edits create a new unreviewed version, leaving served versions and results unchanged',async()=>{
    const question=(await owner.query('select question_id from public.learning_question_versions where id=$1',[learningVersions[0]])).rows[0].question_id;
    const next=(await as(actors.admin,'select public.save_learning_question($1,$2) id',[question,{...questionPayload,prompt:'Revised fixture'}])).rows[0].id;
    const v=(await owner.query('select version,status from public.learning_question_versions where id=$1',[next])).rows[0];
    assert.equal(v.version,2);assert.equal(v.status,'DRAFT');
    const result=(await as(learner,'select public.learning_attempt_result($1) data',[learned.id])).rows[0].data;
    assert.equal(result.answers[0].prompt,'Fixture original 0');assert.equal(result.answers[0].version,1);
  });
  await check('Streak protection is audited and creates no fake completions or XP',async()=>{
    const before=(await owner.query('select count(*)::int n from public.xp_ledger')).rows[0].n;
    await as(actors.admin,'select public.protect_learning_day($1,$2)',[day,'Confirmed outage fixture']);
    assert.equal((await owner.query('select count(*)::int n from public.xp_ledger')).rows[0].n,before);
    await assert.rejects(as(learner,'select public.protect_learning_day($1,$2)',[day,'Forged outage']));
    const summary=(await as(opMember,'select public.get_my_learning_summary() data')).rows[0].data;
    assert.equal(summary.completed_days,0);assert.equal(summary.current_streak,0);
  });
  await check('Retained schedule/series sentinel is still unchanged after operating workflows',async()=>{
    assert.deepEqual((await owner.query('select * from public.retained_content_probe')).rows,before.content);
  });

} catch (error) {
  report.fatal = { code: error.code, error: error.message };
  console.log(`FATAL ${error.code ?? ''} ${error.message}`);
} finally {
  if (owner) await owner.end();
  if (started) {
    try { execFileSync(pg_ctl, ['-D', `${root}/postgres`, '-m', 'fast', '-w', 'stop'], { encoding: 'utf8' }); }
    catch (error) { report.cleanupError = error.message; }
  }
  report.finishedAt = new Date().toISOString();
  report.passed = report.checks.filter(row => row.status === 'PASS').length;
  report.failed = report.checks.filter(row => row.status === 'FAIL').length;
  writeFileSync(`${root}/db-report.json`, JSON.stringify(report, null, 2));
  console.log(`DB SUMMARY: ${report.passed} passed, ${report.failed} failed${report.fatal ? ', fatal setup/migration error' : ''}`);
  process.exitCode = report.failed || report.fatal || report.cleanupError ? 1 : 0;
}
