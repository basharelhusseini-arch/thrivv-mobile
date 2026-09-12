// Isolated PostgreSQL-compatible engine; no production connection or member data.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE gyms(id uuid PRIMARY KEY,timezone text);
CREATE TABLE users(id uuid PRIMARY KEY,gym_id uuid,timezone text,membership_start_date date,reward_points numeric);
CREATE TABLE reward_history(user_id uuid,date date,health_score integer,points_earned numeric,UNIQUE(user_id,date));
CREATE TABLE whoop_connections(id uuid PRIMARY KEY);
CREATE TABLE health_scoring_config(version text PRIMARY KEY,effective_date date);
CREATE TABLE health_score_days(user_id uuid,date date,version text,gym_id uuid,timezone text,score numeric,subtotal numeric,
training_score numeric,recovery_score numeric,habit_score numeric,complete boolean,workouts_complete boolean,recovery_complete boolean,updated_at timestamptz,
PRIMARY KEY(user_id,date,version));
GRANT SELECT,UPDATE ON users,health_score_days TO service_role;
GRANT SELECT ON gyms,health_scoring_config TO service_role;
GRANT ALL ON reward_history TO anon,authenticated;
GRANT SELECT,TRUNCATE ON users TO anon,authenticated;
INSERT INTO users VALUES('${a}',NULL,'UTC',NULL,12.345),('${b}',NULL,'UTC',NULL,NULL);
INSERT INTO whoop_connections VALUES('${a}'),('${b}');
INSERT INTO reward_history VALUES('${a}','2026-09-01',80,10);
INSERT INTO health_scoring_config VALUES('health-v3','2026-09-12');
CREATE FUNCTION public.rehearsal_clock() RETURNS timestamptz LANGUAGE sql AS $$ SELECT current_setting('test.clock')::timestamptz $$;
SET test.clock='2026-09-13T03:00:00Z';`);
const source=await readFile(new URL('../../supabase/migrations/20260912165942_daily_health_rewards.sql',import.meta.url),'utf8');
await db.exec(source.replaceAll('now()', 'public.rehearsal_clock()'));
const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
const balance=async(u=a)=>Number((await scalar('select reward_points from users where id=$1',[u])).reward_points);
const credit=(u=a,start='2026-09-12T00:00:00Z',end='2026-09-13T02:30:00Z') => db.query('select thrivv_reconcile_daily_rewards($1,$2,$3) as result',[u,start,end]);
const day=async(u,date,training,recovery,habits,complete=true,zone='UTC') => db.query(`insert into health_score_days
(user_id,date,version,timezone,score,subtotal,training_score,recovery_score,habit_score,complete,workouts_complete,recovery_complete,updated_at)
values($1,$2,'health-v3',$3,$4,$5,$6,$7,$8,$9,$9,$9,rehearsal_clock())
on conflict(user_id,date,version) do update set score=excluded.score,subtotal=excluded.subtotal,training_score=excluded.training_score,
recovery_score=excluded.recovery_score,habit_score=excluded.habit_score,complete=excluded.complete,workouts_complete=excluded.workouts_complete,
recovery_complete=excluded.recovery_complete,timezone=excluded.timezone,updated_at=excluded.updated_at`,
[u,date,zone,complete?training+recovery+habits:null,training+recovery+habits,training,recovery,habits,complete]);
assert.equal(await balance(),12.345);assert.equal(await balance(b),0);
assert.equal(Number((await scalar('select sum(amount) as amount from reward_transactions')).amount),12.345);
assert.equal((await scalar('select count(*)::int as n from reward_history')).n,1);
await day(a,'2026-09-12',39.5,4,0);
await credit();assert.equal(await balance(),12.345); // disabled by default
await db.exec("update reward_config set enabled=true,activation_date='2026-09-12'");
await db.exec("SET test.clock='2026-09-13T01:59:00Z'");
await credit(a,undefined,'2026-09-13T01:59:00Z');assert.equal(await balance(),12.345);
await db.exec("SET test.clock='2026-09-13T03:00:00Z'");
await db.exec('SET ROLE service_role');await credit();await db.exec('RESET ROLE');
assert.equal(await balance(),55.845);
assert.equal(Number((await scalar('select amount from reward_sources where user_id=$1',[a])).amount),43.5);
await Promise.all(Array.from({length:20},()=>credit()));
assert.equal(await balance(),55.845);
assert.equal((await scalar("select count(*)::int as n from reward_transactions where kind='daily'")).n,1);
// Revision credits only the difference; identical retries are no-ops.
await day(a,'2026-09-12',40,4,0);await credit();await credit();assert.equal(await balance(),56.345);
assert.equal(Number((await scalar("select amount from reward_transactions where kind='adjustment'")).amount),.5);
// Failed/incomplete snapshots never erase an existing credit.
await day(a,'2026-09-12',0,0,0,false);await credit();assert.equal(await balance(),56.345);
// A genuinely verified rest day earns recovery + habits, not invented training.
await day(b,'2026-09-12',0,18,5);await credit(b);assert.equal(await balance(b),23);
// No awards for today, incomplete days, or before activation.
await day(b,'2026-09-11',80,20,10);await day(b,'2026-09-13',80,20,10);
await credit(b,'2026-09-10T00:00:00Z','2026-09-13T02:30:00Z');assert.equal(await balance(b),23);
// Decimal redemption + request retry. A reused request cannot change the offer.
await db.exec("insert into reward_offers values('fixture','Synthetic offer',50.5,true),('other','Other',1,true)");
const request='00000000-0000-4000-8000-000000000099';
await db.exec('SET ROLE service_role');
await db.query('select thrivv_redeem($1,$2,$3)',[a,'fixture',request]);
await db.query('select thrivv_redeem($1,$2,$3)',[a,'fixture',request]);
await assert.rejects(db.query('select thrivv_redeem($1,$2,$3)',[a,'other',request]));
await db.exec('RESET ROLE');assert.equal(await balance(),5.845);
// A downward correction after spending creates an auditable deficit, not a failed correction.
await day(a,'2026-09-12',0,4,0);await credit();assert.equal(await balance(),-34.155);
let summary=(await scalar('select thrivv_reward_summary($1) as result',[a])).result;
assert.equal(summary.points,0);assert.equal(summary.deficit,34.155);assert.equal(summary.earnedSinceActivation,4);
await assert.rejects(db.query('select thrivv_redeem($1,$2,$3)',[a,'other','00000000-0000-4000-8000-000000000098']));
await db.exec("SET test.clock='2026-09-14T03:00:00Z'");
await day(a,'2026-09-13',40,4,0);await credit(a,'2026-09-13T00:00:00Z','2026-09-14T02:30:00Z');
assert.equal(await balance(),9.845);
// Legacy reward history is preserved and a conflicting source date is held, not paid again.
await db.query("insert into reward_history values($1,'2026-09-13',50,1)",[b]);
await credit(b,'2026-09-12T00:00:00Z','2026-09-14T02:30:00Z');assert.equal(await balance(b),23);
// Score validation errors roll back accounting.
await day(a,'2026-09-13',81,20,10);
await assert.rejects(credit(a,'2026-09-13T00:00:00Z','2026-09-14T02:30:00Z'));assert.equal(await balance(),9.845);
// Changing calendar interpretation cannot duplicate an already credited date.
await db.query("update users set timezone='Asia/Dubai' where id=$1",[a]);
await day(a,'2026-09-12',80,20,10,true,'Asia/Dubai');
await credit(a,'2026-09-11T00:00:00Z','2026-09-13T02:30:00Z');assert.equal(await balance(),9.845);
// A 25-hour DST day closes and finalizes using the member's local calendar.
const c='00000000-0000-4000-8000-000000000003';
await db.query("insert into users(id,timezone,reward_points) values($1,'America/New_York',0)",[c]);
await day(c,'2026-11-01',0,18,0,true,'America/New_York');
await db.exec("SET test.clock='2026-11-02T06:59:00Z'");
await credit(c,'2026-11-01T04:00:00Z','2026-11-02T06:59:00Z');assert.equal(await balance(c),0);
await db.exec("SET test.clock='2026-11-02T07:00:00Z'");
await credit(c,'2026-11-01T04:00:00Z','2026-11-02T07:00:00Z');assert.equal(await balance(c),18);
// Current gym and membership boundaries remain enforced.
await db.query("update users set membership_start_date='2026-11-02' where id=$1",[c]);
await day(c,'2026-11-01',80,20,10,true,'America/New_York');
await credit(c,'2026-11-01T04:00:00Z','2026-11-02T07:00:00Z');assert.equal(await balance(c),18);
for (const role of ['anon','authenticated']) {
 await db.exec(`SET ROLE ${role}`);
 for (const sql of ["update users set reward_points=1000",'truncate users','select * from reward_sources','select * from reward_history',
  'insert into reward_transactions(user_id,source_key,kind,amount) values(null,\'fake\',\'daily\',100)',
  `select thrivv_reward_summary('${a}')`,`select thrivv_reconcile_daily_rewards('${a}',now()-interval '1 day',now())`,
  `select thrivv_redeem('${a}','other','${request}')`]) await assert.rejects(db.query(sql));
 await db.exec('RESET ROLE');
}
for(const u of [a,b]) {
 assert.equal(Number((await scalar('select sum(amount) as amount from reward_transactions where user_id=$1',[u])).amount),await balance(u));
}
await db.close();
console.log('PASS: activation, 02:00 gate, 43.5 award, retries, concurrent submissions, corrections, deficits, decimal redemption, rest days, missing data, cutover, timezone changes, legacy preservation, permissions and ledger/balance reconciliation.');
