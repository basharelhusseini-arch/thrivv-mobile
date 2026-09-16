import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(await readFile('supabase/migrations/009_workout_plans_and_workouts.sql', 'utf8'));
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.workouts FROM anon, authenticated;
    GRANT ALL ON public.workouts TO service_role;
    INSERT INTO workout_plans(id, member_id, name, goal, duration, frequency, difficulty, start_date)
      VALUES ('plan', 'member', 'Existing plan', 'strength', 4, 3, 'beginner', '2026-09-16');
    INSERT INTO workouts(id, workout_plan_id, member_id, name, date)
      VALUES ('planned', 'plan', 'member', 'Existing workout', '2026-09-16');
  `);
  await db.exec(await readFile('supabase/migrations/20260916192002_standalone_workout_logs.sql', 'utf8'));
  const exercises = [{ name: 'Custom movement', sets: 3, reps: 12 }];
  await db.query(`
    INSERT INTO workouts(id, workout_plan_id, member_id, name, date, exercises, status, completed_at)
    VALUES ('manual', NULL, 'member', 'My workout', '2026-09-16', $1::jsonb, 'completed', now())
  `, [JSON.stringify(exercises)]);
  const { rows } = await db.query(`SELECT * FROM workouts WHERE member_id = 'member' AND workout_plan_id IS NULL AND status = 'completed' ORDER BY date DESC, completed_at DESC`);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].exercises, exercises);
  assert.equal(rows[0].id, 'manual');
  assert.equal((await db.query(`SELECT count(*) FROM workouts WHERE workout_plan_id = 'plan'`)).rows[0].count, 1);
  await assert.rejects(db.exec(`INSERT INTO workouts(id, workout_plan_id, member_id, name, date) VALUES ('invalid', 'missing-plan', 'member', 'Invalid', '2026-09-16')`));
  const { rows: access } = await db.query(`
    SELECT relrowsecurity,
      has_table_privilege('anon', 'workouts', 'SELECT') AS anon_read,
      has_table_privilege('authenticated', 'workouts', 'INSERT') AS client_write,
      has_table_privilege('service_role', 'workouts', 'INSERT') AS server_write
    FROM pg_class WHERE relname = 'workouts'
  `);
  assert.equal(access[0].relrowsecurity, true);
  assert.equal(access[0].anon_read, false);
  assert.equal(access[0].client_write, false);
  assert.equal(access[0].server_write, true);
  await db.exec(`DELETE FROM workout_plans WHERE id = 'plan'`);
  assert.equal((await db.query(`SELECT count(*) FROM workouts WHERE id = 'planned'`)).rows[0].count, 0);
  assert.equal((await db.query(`SELECT count(*) FROM workouts WHERE id = 'manual'`)).rows[0].count, 1);
  console.log('Standalone workout migration verified: logs persist, plan links and cascade preserved, permissions unchanged.');
} finally {
  await db.close();
}
