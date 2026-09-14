import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

// Uses only a fresh local PostgreSQL instance, never project credentials.
const dependencyRoot = process.env.DONUTS_DB_TEST_DEPS;
if (!dependencyRoot) throw new Error('Set DONUTS_DB_TEST_DEPS as documented in docs/SCHEDULE_SERIES_REMOVAL.md.');
const require = createRequire(resolve(dependencyRoot, 'package.json'));
const { Client } = require('pg');
const { initdb, pg_ctl } = require('@embedded-postgres/' + process.platform + '-' + process.arch);
const root = mkdtempSync(join(tmpdir(), 'donuts-schedule-removal-'));
const config = { host: `${root}/socket`, port: 55441, user: 'donuts_test_owner', database: 'postgres' };
const client = new Client(config);
const retired = ['events', 'seasons', 'blind_structures', 'blind_structure_rows'];
const migrationDir = resolve('supabase/migrations');
const migration = readFileSync(join(migrationDir, '0031_remove_schedule_series.sql'), 'utf8');
const checks = [];
let started = false;
let connected = false;
const quote = name => '"' + name.replaceAll('"', '""') + '"';

async function snapshot(excluded = []) {
  const { rows: tables } = await client.query("select schemaname,tablename from pg_tables where schemaname in ('public','auth','storage') order by 1,2");
  const result = {};
  for (const { schemaname, tablename } of tables) {
    if (schemaname === 'public' && excluded.includes(tablename)) continue;
    result[`${schemaname}.${tablename}`] = (await client.query(`select count(*)::integer count, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) hash from ${quote(schemaname)}.${quote(tablename)} t`)).rows[0];
  }
  return result;
}

async function check(name, task) {
  await task();
  checks.push(name);
  console.log(`PASS ${name}`);
}

try {
  mkdirSync(config.host, { mode: 0o700 });
  execFileSync(initdb, ['-D', `${root}/postgres`, '-U', config.user, '-A', 'trust', '--no-locale', '-E', 'UTF8'], { stdio: 'pipe' });
  execFileSync(pg_ctl, ['-D', `${root}/postgres`, '-l', `${root}/postgres.log`, '-o', `-k ${config.host} -p ${config.port} -c listen_addresses='' -c wal_level=logical`, '-w', 'start'], { stdio: 'pipe' });
  started = true;
  await client.connect();
  connected = true;
  await client.query(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema storage;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text unique,email_confirmed_at timestamptz,raw_user_meta_data jsonb not null default '{}');
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    create publication supabase_realtime;
  `);
  await check('Unchanged migrations 0001 through 0030 replay in order', async () => {
    for (const file of readdirSync(migrationDir).filter(file => /^00\d\d_.*\.sql$/.test(file) && file < '0031').sort()) {
      await client.query(readFileSync(join(migrationDir, file), 'utf8'));
    }
  });
  await client.query(`
    insert into public.seasons(id,name,year) values('10000000-0000-4000-8000-000000000001','Retired fixture',2026);
    insert into public.blind_structures(id,name) values('10000000-0000-4000-8000-000000000002','Retired fixture');
    insert into public.blind_structure_rows(structure_id,row_type,level_no) values('10000000-0000-4000-8000-000000000002','level',1);
    insert into public.events(title,season_id,blind_structure_id) values('Retired fixture','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
    insert into public.schools(id,name) values('20000000-0000-4000-8000-000000000001','Retained school');
    insert into auth.users(id,email,email_confirmed_at) values('20000000-0000-4000-8000-000000000002','member@donuts.test',now());
    insert into public.member_profiles(id,name,phone,school_id,status,consent_version) values('20000000-0000-4000-8000-000000000002','Retained member','01000000000','20000000-0000-4000-8000-000000000001','ACTIVE','fixture');
    insert into public.classes(name,place,weekday,start_time) values('Retained class','Fixture',1,'19:00');
    insert into public.clubs(name,school_id) values('Retained club','20000000-0000-4000-8000-000000000001');
    insert into storage.objects(bucket_id,name) values('media','shared-sponsor.png');
    update public.site_config set footer_sponsors='[{"name":"Retained sponsor"}]';
  `);

  for (const [name, create, drop] of [
    ['Unexpected event views', 'create view public.removal_dependency as select * from public.events', 'drop view public.removal_dependency'],
    ['Unexpected enum consumers', 'create table public.removal_dependency(kind public.row_type)', 'drop table public.removal_dependency'],
  ]) {
    await check(`${name} abort and roll back all preceding deletions`, async () => {
      await client.query(create);
      const before = await snapshot();
      await assert.rejects(client.query(migration), { code: '2BP01' });
      await client.query('rollback');
      assert.deepEqual(await snapshot(), before);
      assert.ok((await client.query("select to_regprocedure('public.activate_season(uuid)') as function")).rows[0].function);
      await client.query(drop);
    });
  }

  const before = await snapshot(retired);
  const policies = (await client.query('select * from pg_policies where schemaname in (\'public\',\'storage\') and not (tablename=any($1)) order by schemaname,tablename,policyname', [retired])).rows;
  await check('0031 removes the four populated tables, activation function and enum', async () => {
    await client.query(migration);
    for (const name of retired) assert.equal((await client.query('select to_regclass($1) as relation', [`public.${name}`])).rows[0].relation, null);
    const result = (await client.query("select to_regprocedure('public.activate_season(uuid)') as function,to_regtype('public.row_type') as type")).rows[0];
    assert.deepEqual(result, { function: null, type: null });
  });
  await check('All other table data, Auth, shared media and settings remain byte-for-byte equivalent', async () => {
    assert.deepEqual(await snapshot(), before);
  });
  await check('Remaining public and storage RLS policies are unchanged', async () => {
    assert.deepEqual((await client.query("select * from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname")).rows, policies);
  });
  await check('Shared admin authorization and update trigger function remain available', async () => {
    assert.ok((await client.query("select to_regprocedure('public.is_admin()') as function")).rows[0].function);
    assert.ok((await client.query("select to_regprocedure('public.set_updated_at()') as function")).rows[0].function);
  });
  await check('Reapplying the removal is safe and does not change remaining rows', async () => {
    await client.query(migration);
    assert.deepEqual(await snapshot(), before);
  });
  console.log(`DB SUMMARY: ${checks.length} checks passed`);
} finally {
  if (connected) await client.end();
  if (started) execFileSync(pg_ctl, ['-D', `${root}/postgres`, '-m', 'fast', '-w', 'stop'], { stdio: 'pipe' });
  writeFileSync(`${root}/report.json`, JSON.stringify({ checks, finishedAt: new Date().toISOString() }, null, 2));
  console.log(`Report: ${root}/report.json`);
}
