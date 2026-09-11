// Run with PGLITE_MODULE pointing to an isolated installation; no live database access.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE users(id uuid PRIMARY KEY,first_name text,last_name text,email text,created_at timestamptz DEFAULT now(),user_id uuid,
whoop_user_id bigint,whoop_access_token text,whoop_refresh_token text,whoop_token_expires_at timestamptz,whoop_connected_at timestamptz,
reward_points numeric DEFAULT 0 CHECK(reward_points>=0));
CREATE TABLE reward_history(user_id uuid REFERENCES users(id),date date,health_score int,confidence_score int,total_rewards_score int,confidence_multiplier numeric,points_earned numeric,UNIQUE(user_id,date));
CREATE TABLE whoop_data(user_id uuid); CREATE TABLE health_scores(user_id uuid); CREATE TABLE verification_events(user_id uuid); CREATE TABLE daily_checkins(user_id uuid);
INSERT INTO users(id,email,reward_points,whoop_access_token,whoop_refresh_token) VALUES
('00000000-0000-4000-8000-000000000001','a@example.test',10,'synthetic-access','synthetic-refresh'),
('00000000-0000-4000-8000-000000000002','b@example.test',0,NULL,NULL);
INSERT INTO reward_history VALUES('00000000-0000-4000-8000-000000000001','2026-09-01',75,30,75,1,10);
`);
await db.exec(await readFile(new URL('../../supabase/migrations/20260911145736_secure_gym_workout_rewards.sql', import.meta.url),'utf8'));
const a='00000000-0000-4000-8000-000000000001'; const b='00000000-0000-4000-8000-000000000002';
const scalar=async sql=>(await db.query(sql)).rows[0];
assert.equal((await scalar(`select reward_points from users where id='${a}'`)).reward_points,'10');
assert.equal((await scalar(`select whoop_access_token from users where id='${a}'`)).whoop_access_token,null);
assert.equal((await scalar(`select whoop_access_token from whoop_connections where id='${a}'`)).whoop_access_token,'synthetic-access');
const credit=`select thrivv_credit_daily('${a}','2026-09-01',85,30,85,1,15)`;
await Promise.all(Array.from({length:10},()=>db.query(credit)));
assert.equal((await scalar(`select reward_points from users where id='${a}'`)).reward_points,'15');
assert.equal((await scalar(`select count(*)::int as n from reward_transactions where user_id='${a}'`)).n,2);
await db.exec(`insert into reward_offers values('test','Synthetic offer',7,true)`);
const request='00000000-0000-4000-8000-000000000010';
await db.query(`select thrivv_redeem('${a}','test','${request}')`);
await db.query(`select thrivv_redeem('${a}','test','${request}')`);
assert.equal((await scalar(`select reward_points from users where id='${a}'`)).reward_points,'8');
await db.query(credit); // Daily recomputation must NOT restore spent points.
assert.equal((await scalar(`select reward_points from users where id='${a}'`)).reward_points,'8');
await assert.rejects(db.query(`select thrivv_redeem('${b}','test','${request}')`));
assert.equal((await scalar(`select count(*)::int as n from reward_redemptions where user_id='${b}'`)).n,0);
await db.exec(`insert into gyms(id,name,owner_email) values('${a}','Gym A','a@example.test'),('${b}','Gym B','b@example.test');
insert into gym_invitations(token_hash,gym_id,created_by,expires_at) values('one','${a}','${a}',now()+interval '1 day'),('two','${b}','${b}',now()+interval '1 day');`);
await db.query(`select thrivv_accept_invitation('${a}','one')`);
await db.query(`select thrivv_accept_invitation('${a}','one')`);
await assert.rejects(db.query(`select thrivv_accept_invitation('${a}','two')`));
assert.equal((await scalar(`select gym_id from users where id='${a}'`)).gym_id,a);
assert.equal((await scalar(`select thrivv_lock_sync('${a}','${a}') as locked`)).locked,true);
assert.equal((await scalar(`select thrivv_lock_sync('${a}','${b}') as locked`)).locked,false);
await db.query(`select thrivv_release_sync('${a}','${b}')`);
assert.equal((await scalar(`select thrivv_lock_sync('${a}','${b}') as locked`)).locked,false);
await db.query(`select thrivv_release_sync('${a}','${a}')`);
assert.equal((await scalar(`select thrivv_lock_sync('${a}','${b}') as locked`)).locked,true);
const workout = { id: '00000000-0000-4000-8000-000000000099', start_at: '2026-09-02T10:00:00Z', end_at:'2026-09-02T11:00:00Z',duration_ms:3600000,strain:12,score_state:'SCORED',source_updated_at:'2026-09-02T11:10:00Z' };
const storeWorkouts = (user,records) => db.query('select thrivv_store_workouts($1,$2,$3,$4)',[user,JSON.stringify(records),'2026-09-01T00:00:00Z','2026-09-08T00:00:00Z']);
await storeWorkouts(a,[workout]);
await storeWorkouts(a,[workout]);
assert.equal((await scalar('select count(*)::int as n from whoop_workouts')).n,1);
await assert.rejects(storeWorkouts(b,[workout]));
await storeWorkouts(a,[{...workout,strain:null,score_state:'PENDING_SCORE',source_updated_at:'2026-09-03T00:00:00Z'}]);
assert.equal((await scalar('select strain from whoop_workouts')).strain,'12');
await storeWorkouts(a,[]);
assert.ok((await scalar('select deleted_at from whoop_workouts')).deleted_at);
await storeWorkouts(a,[{...workout,strain:13,source_updated_at:'2026-09-04T00:00:00Z'}]);
assert.equal((await scalar('select deleted_at from whoop_workouts')).deleted_at,null);
assert.equal((await scalar('select strain from whoop_workouts')).strain,'13');
await db.exec('SET ROLE authenticated');
for(const sql of [`update users set is_admin=true`,`select * from whoop_connections`,`insert into verification_events values('${a}')`,`select thrivv_credit_daily('${a}','2026-09-01',85,30,85,1,15)`,`select * from reward_transactions`,`select * from gyms`]) await assert.rejects(db.query(sql));
await db.exec('RESET ROLE');
assert.equal((await scalar(`select reward_points::numeric = (select sum(amount) from reward_transactions where user_id='${a}') as consistent from users where id='${a}'`)).consistent,true);
await db.close();
console.log('PASS: migration, balance preservation, retry-safe credits/debits, insufficient funds, tenant membership, sync locks, direct-access restrictions, ledger consistency');
console.log('PGlite serialises queries; this is not a multi-connection production concurrency load test.');
