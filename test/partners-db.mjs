import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Runs only against the isolated PostgreSQL fixture harness.
export async function runPartnersChecks({ owner, as, check, rejected, actors, ids }) {
  async function member(status = 'ACTIVE', verified = true) {
    const actor = { id: randomUUID(), email: `partners-${randomUUID()}@donuts.test` };
    await owner.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)', [actor.id, actor.email, verified ? new Date() : null]);
    await owner.query('insert into public.member_profiles(id,username,name,phone,school_id,status,consent_version) values($1,$2,$3,$4,$5,$6,$7)',
      [actor.id, null, 'Fixture partner reader', '01000000000', ids.schoolA, status, 'v1']);
    return actor;
  }
  const active = await member(), suspended = await member('SUSPENDED'), unverified = await member('ACTIVE', false), withdrawn = await member('WITHDRAWN');
  const payload = name => ({ name, description: 'Isolated fixture only', logo_url: 'https://storage.example/fixture.png', url: 'https://partner.example/' });
  const save = async (actor, id, revision, fields) => (await as(actor, 'select public.save_partner($1,$2,$3) id', [id, revision, fields])).rows[0].id;
  const read = async () => (await owner.query('select id,name,description,logo_url,url,sort_order,revision from public.partners order by sort_order,id')).rows;
  const one = await save(actors.admin, null, null, payload('Fixture Partner A'));
  const two = await save(actors.admin, null, null, payload('Fixture Partner B'));
  const three = await save(actors.admin, null, null, payload('Fixture Partner C'));

  await check('Partners persist ordered records and uploaded logo URLs; only active members and admins can read', async () => {
    const rows = (await as(active, 'select id,logo_url from public.partners order by sort_order,id')).rows;
    assert.deepEqual(rows.map(row => row.id), [one, two, three]);
    assert.ok(rows.every(row => row.logo_url === 'https://storage.example/fixture.png'));
    assert.equal((await as(actors.admin, 'select * from public.partners')).rowCount, 3);
    for (const actor of [suspended, unverified, withdrawn]) assert.equal((await as(actor, 'select * from public.partners')).rowCount, 0);
    await rejected(() => as(null, 'select * from public.partners'), '42501');
  });
  await check('Partner RPCs and direct writes deny regular members; invalid URLs never persist', async () => {
    await rejected(() => save(active, null, null, payload('Forbidden fixture')), 'forbidden');
    await rejected(() => as(active, 'select public.delete_partner($1,$2)', [one, 1]), 'forbidden');
    await rejected(() => as(active, 'select public.reorder_partners($1)', [JSON.stringify([{ id: one, revision: 1 }])]), 'forbidden');
    await rejected(() => as(active, "insert into public.partners(name,url,sort_order) values('Forged','https://partner.example/',99)"), '42501');
    for (const url of ['javascript:alert(1)', '//partner.example', 'https://user:password@partner.example/', 'https://partner.example/\npath', 'https://partner.example\\@evil.example/']) {
      await rejected(() => save(actors.admin, null, null, { ...payload('Invalid fixture'), url }), 'invalid_partner');
    }
    await rejected(() => save(actors.admin, null, null, { ...payload('Invalid logo fixture'), logo_url: 'http://storage.example/logo.png' }), 'invalid_partner');
    assert.equal((await read()).length, 3);
  });
  await check('Concurrent partner edits admit one revision and reject stale saves and deletion', async () => {
    const results = await Promise.allSettled([
      save(actors.admin, one, 1, payload('Fixture concurrent A')),
      save(actors.admin, one, 1, payload('Fixture concurrent B')),
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const failed = results.find(result => result.status === 'rejected');
    assert.equal(failed.reason.message, 'stale_partner');
    assert.equal((await read()).find(row => row.id === one).revision, 2);
    await rejected(() => as(actors.admin, 'select public.delete_partner($1,$2)', [one, 1]), 'stale_partner');
    assert.equal((await read()).length, 3);
  });
  await check('Partner reorder atomically verifies every revision and rejects duplicate or incomplete snapshots', async () => {
    const before = await read();
    const reordered = [before.find(row => row.id === three), before.find(row => row.id === one), before.find(row => row.id === two)]
      .map(({ id, revision }) => ({ id, revision }));
    await rejected(() => as(actors.admin, 'select public.reorder_partners($1)', [JSON.stringify(reordered.slice(1))]), 'stale_partner');
    await rejected(() => as(actors.admin, 'select public.reorder_partners($1)', [JSON.stringify([reordered[0], reordered[0], reordered[1]])]), 'invalid_partner_order');
    const stale = reordered.map(row => row.id === one ? { ...row, revision: 1 } : row);
    await rejected(() => as(actors.admin, 'select public.reorder_partners($1)', [JSON.stringify(stale)]), 'stale_partner');
    assert.deepEqual(await read(), before);
    await as(actors.admin, 'select public.reorder_partners($1)', [JSON.stringify(reordered)]);
    const after = await read();
    assert.deepEqual(after.map(row => row.id), [three, one, two]);
    assert.deepEqual(after.map(row => row.sort_order), [1, 2, 3]);
    assert.deepEqual(after.map(row => row.revision), [2, 3, 2]);
    await rejected(() => save(actors.admin, two, 1, payload('Stale after move')), 'stale_partner');
    const four = await save(actors.admin, null, null, payload('Fixture Partner D'));
    await rejected(() => as(actors.admin, 'select public.reorder_partners($1)', [JSON.stringify(after.map(({ id, revision }) => ({ id, revision })))]), 'stale_partner');
    assert.equal((await read()).at(-1).id, four);
  });
  await check('Partner removal uses the current revision and keeps remaining order and logo records intact', async () => {
    const before = await read();
    const target = before.find(row => row.id === one);
    await as(actors.admin, 'select public.delete_partner($1,$2)', [one, target.revision]);
    assert.deepEqual(await read(), before.filter(row => row.id !== one));
  });
}
