import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function runLearningExperienceChecks({ owner, as, check, rejected, actors, ids }) {
  const spot = { game: 'NLHE', category: 'FLOP', format: 'MTT', players: 6, stack_bb: 30,
    hero_position: 'BTN', villain_position: 'BB', hero_hand: ['As', 'Kh'], board: ['Qs', 'Td', '2c'], pot_bb: 5.5,
    action_history: 'BTN raises 2 BB, BB calls. BB checks flop.' };
  const payload = { prompt: 'Isolated structured learning fixture', choices: [{ id: 'a', text: 'Check' }, { id: 'b', text: 'Bet' }, { id: 'c', text: 'Fold' }],
    answer_mode: 'SINGLE', correct_ids: ['a'], explanation: 'Reviewed fixture reasoning', difficulty: 'INTERMEDIATE', kind: 'GTO',
    authorship_confirmed: true, authorship_note: 'Original local fixture, never live content', spot,
    gto_evidence: { solver: 'Fixture solver', assumptions: 'No rake', evidence: 'Local fixture report', frequencies: 'Check 100%' } };
  const author = async (value, question = null) => (await as(actors.admin, 'select public.save_learning_question($1,$2) id', [question, value])).rows[0].id;
  const publish = async id => as(actors.admin, 'select public.review_learning_question($1,true,$2,$3)', [id, { original: true, answer: true, explanation: true, gto: true }, 'Fixture review']);
  const learner = { id: randomUUID(), email: 'learning-experience-' + randomUUID() + '@donuts.test' };
  await owner.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [learner.id, learner.email]);
  await owner.query("insert into public.member_profiles(id,name,phone,school_id,status,consent_version) values($1,'Learning Experience','01000000000',$2,'ACTIVE','v1')", [learner.id, ids.schoolA]);
  const day = (await owner.query("select (clock_timestamp() at time zone 'Asia/Seoul')::date::text as learning_day")).rows[0].learning_day;

  await check('Structured poker spots reject invalid cards, board stages, stacks, positions and unbounded data in the database', async () => {
    for (const invalid of [null, {}, { ...spot, board: ['As', 'Td', '2c'] }, { ...spot, board: ['Qs', 'Td'] },
      { ...spot, hero_hand: ['As', 'As'] }, { ...spot, hero_hand: ['AX', 'Kh'] }, { ...spot, stack_bb: 0 },
      { ...spot, players: 6.5 }, { ...spot, players: 11 }, { ...spot, pot_bb: null }, { ...spot, villain_position: 'BTN' },
      { ...spot, hero_position: 'DEALER' }, { ...spot, format: 'UNKNOWN' }, { ...spot, action_history: '' },
      { ...spot, correct_ids: ['a'] }, { ...spot, category: 'PREFLOP' }]) {
      await rejected(() => author({ ...payload, spot: invalid }), 'invalid_learning_spot');
    }
    await rejected(() => as(learner, 'select public.save_learning_question(null,$1)', [payload]), 'forbidden');
  });

  const versions = [];
  await check('Structured original questions create separately reviewed versions with preserved spot fields', async () => {
    for (let index = 0; index < 5; index++) {
      const id = await author({ ...payload, prompt: 'Structured fixture ' + index, ...(index === 4 ? { answer_mode: 'MULTIPLE', correct_ids: ['a', 'b'] } : {}) });
      versions.push(id);
      const row = (await owner.query('select * from public.learning_question_versions where id=$1', [id])).rows[0];
      assert.deepEqual(row.spot, spot);
      assert.equal(row.status, 'DRAFT');
      await rejected(() => as(actors.admin, 'select public.review_learning_question($1,true,$2,$3)', [id, { original: true, answer: true }, 'Incomplete']), 'review_required');
      await publish(id);
    }
  });

  await check('Member daily serving and original review preserve the structured spot without revealing answers before exact-set grading', async () => {
    assert.equal(versions.length, 5, 'All five structured fixture versions must exist');
    await owner.query('begin');
    try {
      // The baseline has already scheduled today. Replace this isolated fixture only
      // inside the rolled-back transaction; every member operation uses its real role.
      await owner.query('update public.learning_daily_sets set version_ids=$1 where day=$2', [versions, day]);
      const acting = async (actor, sql, args = []) => {
        await owner.query('reset role');
        await owner.query('set local role authenticated');
        await owner.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: actor.id, email: actor.email, role: 'authenticated' })]);
        return owner.query(sql, args);
      };
      const served = (await acting(learner, 'select public.get_daily_learning() data')).rows[0].data;
      assert.equal(served.result, null);
      assert.deepEqual(served.questions.map(q => q.id), versions);
      for (const question of served.questions) {
        assert.deepEqual(question.spot, spot);
        for (const field of ['correct_ids', 'explanation', 'gto_evidence', 'frequencies']) assert.equal(field in question, false);
      }
      const wrongAnswers = Object.fromEntries(versions.map((id, index) => [id, index === 4 ? ['b'] : ['a']]));
      const first = (await acting(learner, 'select public.submit_daily_learning($1,$2) data', [day, wrongAnswers])).rows[0].data;
      assert.equal(first.correct_count, 4); assert.equal(first.xp, 30); assert.equal(first.current_streak, 1);
      assert.deepEqual(first.answers[4].spot, spot);
      assert.deepEqual(first.answers[4].correct_ids, ['a', 'b']);
      const retry = (await acting(learner, 'select public.submit_daily_learning($1,$2) data', [day, { ...wrongAnswers, [versions[4]]: ['a', 'b'] }])).rows[0].data;
      assert.equal(retry.id, first.id); assert.equal(retry.correct_count, 4); assert.equal(retry.xp, 30);
      const questionId = first.answers[4].question_id;
      await acting(actors.admin, 'select public.save_learning_question($1,$2)', [questionId, { ...payload, spot: { ...spot, stack_bb: 100 } }]);
      const summary = (await acting(learner, 'select public.get_my_learning_summary() data')).rows[0].data;
      assert.equal(summary.wrong_answers.length, 1);
      assert.deepEqual(summary.wrong_answers[0].spot, spot);
      assert.equal(summary.wrong_answers[0].version, 1);
      const activity = (await acting(learner, 'select public.get_my_class_activity() data')).rows[0].data;
      assert.equal(activity.total_xp, 30); assert.equal(activity.weekly_xp, 30);
      assert.equal(activity.ledger.length, 1);
      assert.equal(activity.ledger[0].learning_day, day);
      assert.equal(activity.ledger[0].source_kind, 'DAILY_LEARNING');
      assert.equal(activity.ledger[0].class_name, null); assert.equal(activity.ledger[0].session_number, null);
    } finally { await owner.query('rollback'); }
  });

  await check('Published spot content is immutable even for an owner-level accidental update', async () => {
    assert.equal(versions.length, 5);
    await owner.query('begin');
    try { await rejected(() => owner.query("update public.learning_question_versions set spot=jsonb_set(spot,'{stack_bb}','99') where id=$1", [versions[0]]), 'immutable_learning_version'); }
    finally { await owner.query('rollback'); }
    await rejected(() => as(actors.admin, 'delete from public.learning_question_versions where id=$1', [versions[0]]), '42501');
  });

  await check('Existing completion and perfect-bonus ledger rows remain visible in unified MY totals', async () => {
    const activity = (await as(actors.learner, 'select public.get_my_class_activity() data')).rows[0].data;
    assert.equal(activity.total_xp, 40); assert.equal(activity.weekly_xp, 40);
    assert.equal(activity.ledger.length, 2);
    assert.deepEqual(activity.ledger.map(row => row.delta).sort((a, b) => a - b), [10, 30]);
    assert.ok(activity.ledger.every(row => row.source_kind === 'DAILY_LEARNING' && row.learning_day === day));
    assert.equal(activity.ledger.reduce((total, row) => total + row.delta, 0), activity.total_xp);
    const daily = (await as(actors.learner, 'select public.get_daily_learning() data')).rows[0].data;
    assert.equal(daily.result.current_streak, 1);
    assert.ok(daily.questions.every(question => question.spot === null));
  });

  await check('Weekly XP begins at Monday midnight in Seoul while preserving all-time XP', async () => {
    const now = new Date((await owner.query('select clock_timestamp() now')).rows[0].now);
    const seoul = new Date(now.getTime() + 9 * 3600000);
    const monday = Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth(), seoul.getUTCDate() - (seoul.getUTCDay() + 6) % 7) - 9 * 3600000;
    await owner.query('begin');
    try {
      await owner.query('update public.xp_ledger set created_at=case delta when 30 then $2::timestamptz else $3::timestamptz end where user_id=$1', [actors.learner.id, new Date(monday - 1), new Date(monday)]);
      await owner.query('set local role authenticated');
      await owner.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: actors.learner.id, email: actors.learner.email, role: 'authenticated' })]);
      const activity = (await owner.query('select public.get_my_class_activity() data')).rows[0].data;
      assert.equal(activity.total_xp, 40); assert.equal(activity.weekly_xp, 10); assert.equal(activity.ledger.length, 2);
    } finally { await owner.query('rollback'); }
  });
}
