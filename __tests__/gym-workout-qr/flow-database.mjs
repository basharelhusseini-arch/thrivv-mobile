// In-memory synthetic database only; never accepts a database connection string.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
CREATE TABLE gyms(id uuid PRIMARY KEY,timezone text NOT NULL);
CREATE TABLE users(id uuid PRIMARY KEY,is_admin boolean,gym_id uuid,membership_start_date date,reward_points numeric);
CREATE TABLE gym_operators(gym_id uuid,user_id uuid,PRIMARY KEY(gym_id,user_id));
CREATE TABLE whoop_workouts(id uuid PRIMARY KEY,user_id uuid,gym_id uuid,start_at timestamptz,end_at timestamptz,deleted_at timestamptz,score_input_valid boolean,score_state text,workout_score numeric);
CREATE TABLE health_score_days(user_id uuid,date date,version text,gym_id uuid,timezone text,workout_score numeric,complete boolean,workouts_complete boolean,recovery_complete boolean,score numeric,PRIMARY KEY(user_id,date,version));
CREATE TABLE reward_history(user_id uuid,date date,points_earned numeric);
CREATE TABLE daily_checkins(user_id uuid,habit_details jsonb);
GRANT ALL ON reward_history,daily_checkins TO anon,authenticated;
GRANT INSERT(habit_details),UPDATE(habit_details) ON daily_checkins TO anon,authenticated;
`);
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const member=id(1),admin=id(2),other=id(3),ga=id(4),gb=id(5),workout=id(6);
await db.query("insert into gyms values($1,'UTC'),($2,'UTC')",[ga,gb]);
await db.query("insert into users values($1,false,$4,current_date-2,12.345),($2,true,null,null,null),($3,false,$5,current_date-2,0)",[member,admin,other,ga,gb]);
await db.exec(await readFile('supabase/migrations/20260913122819_gym_verified_rewards_flow.sql','utf8'));
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
assert.equal(await scalar('select reward_points from users where id=$1',[member]),'12.345');
assert.equal(await scalar("select amount from reward_transactions where user_id=$1 and kind='opening'",[member]),'12.345');
const verify=(who=member,w=workout,gym=ga,operator=admin,request=id(10),expires=60)=>db.query('select thrivv_verify_gym_workout($1,$2,$3,$4,floor(extract(epoch from clock_timestamp()))::bigint,floor(extract(epoch from clock_timestamp()))::bigint+$6,$5)',[who,w,gym,operator,request,expires]);
const reconcile=()=>scalar('select thrivv_reconcile_gym_reward($1,current_date)',[member]);
await db.query("insert into whoop_workouts values($1,$2,$3,now()-interval '1 hour',now()-interval '5 minutes',null,true,'SCORED',49.4)",[workout,member,ga]);
await db.query("insert into health_score_days values($1,current_date,'health-v3',$2,'UTC',49.4,true,true,true,43.5)",[member,ga]);
await db.exec('SET ROLE service_role');
assert.equal((await reconcile()).status,'not_activated'); await assert.rejects(verify());
await db.exec('RESET ROLE; UPDATE gym_reward_config SET verification_enabled=true,rewards_enabled=true,effective_date=current_date,points_per_health_point=2,max_daily_points=100; SET ROLE service_role;');
await assert.rejects(verify(other)); await assert.rejects(verify(member,workout,gb)); await assert.rejects(verify(member,workout,ga,other)); await assert.rejects(verify(member,workout,ga,admin,id(10),0));
assert.equal((await reconcile()).awarded,0);
await assert.rejects(verify(member,id(999))); // no imported workout
await assert.rejects(db.query('select thrivv_verify_gym_workout($1,$2,$3,$4,floor(extract(epoch from now()))::bigint-120,floor(extract(epoch from now()))::bigint-60,$5)',[member,workout,ga,admin,id(99)]));
await db.query("insert into whoop_workouts values($1,$2,$3,now()-interval '4 hours',now()-interval '3 hours',null,true,'SCORED',0)",[id(90),member,ga]);
await assert.rejects(verify(member,id(90),ga,admin,id(91)));
await db.query('delete from whoop_workouts where id=$1',[id(90)]);
await db.query("update whoop_workouts set end_at=now()+interval '1 hour' where id=$1",[workout]);
await assert.rejects(verify());
await db.query("update whoop_workouts set end_at=now()-interval '5 minutes',deleted_at=now() where id=$1",[workout]);
await assert.rejects(verify());
await db.query('update whoop_workouts set deleted_at=null where id=$1',[workout]);
await verify(); await verify();
assert.equal(await scalar('select count(*)::int from gym_workout_verifications'),1);
await Promise.all(Array.from({length:8},()=>reconcile()));
assert.equal((await reconcile()).awarded,87);
assert.equal(await scalar("select count(*)::int from reward_transactions where kind='daily_credit'"),1);
assert.equal(await scalar('select reward_points from users where id=$1',[member]),'99.345');
// Pending sync must preserve valid prior credits.
await db.exec('RESET ROLE; UPDATE health_score_days SET complete=false,score=null; SET ROLE service_role');
assert.equal((await reconcile()).status,'score_pending');
assert.equal(await scalar('select reward_points from users where id=$1',[member]),'99.345');
await db.exec('RESET ROLE; UPDATE health_score_days SET complete=true,score=50; SET ROLE service_role');
assert.equal((await reconcile()).awarded,100);
assert.equal(await scalar('select reward_points from users where id=$1',[member]),'112.345');
// A larger unverified workout cannot be unlocked by the smaller verified workout.
await db.query("insert into whoop_workouts values($1,$2,$3,now()-interval '45 minutes',now()-interval '1 minute',null,true,'SCORED',60)",[id(7),member,ga]);
await db.query('update health_score_days set workout_score=60,score=52 where user_id=$1',[member]);
assert.equal((await reconcile()).awarded,0);
await verify(member,id(7),ga,admin,id(11)); assert.equal((await reconcile()).awarded,100);
// Spending does not reduce gym earned points. Duplicate request returns same redemption.
await db.exec("RESET ROLE; INSERT INTO reward_offers VALUES('synthetic','Synthetic offer',60,true); SET ROLE service_role");
const redeem=()=>scalar('select thrivv_redeem($1,$2,$3)',[member,'synthetic',id(12)]);
const receipt=await redeem(); assert.equal((await redeem()).id,receipt.id);
assert.equal((await scalar('select thrivv_gym_reward_metrics($1)',[ga])).earned,100);
assert.equal(await scalar('select reward_points from users where id=$1',[member]),'52.345');
// A reduction beyond spendable funds creates a hold, not a negative balance.
await db.query('update health_score_days set score=10 where user_id=$1',[member]);
assert.equal((await reconcile()).status,'review_required');
await assert.rejects(scalar('select thrivv_redeem($1,$2,$3)',[member,'synthetic',id(13)]));
assert.equal(await scalar('select reward_points from users where id=$1',[member]),'52.345');
// Membership changes never transfer historical earned points or create a second entitlement.
await db.query('update users set gym_id=$2 where id=$1',[member,gb]);
assert.equal((await reconcile()).status,'historical_membership');
assert.equal((await scalar('select thrivv_gym_reward_metrics($1)',[gb])).earned,0);
assert.equal(await scalar('select count(*)::int from daily_reward_entitlements where user_id=$1',[member]),1);
await assert.rejects(db.query("update reward_transactions set amount=999"));
await assert.rejects(db.query('delete from gym_workout_verifications'));
for (const role of ['anon','authenticated']) {
 await db.exec(`RESET ROLE; SET ROLE ${role}`);
 for (const table of ['gym_reward_config','gym_workout_verifications','daily_reward_entitlements','reward_transactions','reward_offers','reward_redemptions']) await assert.rejects(db.query(`select * from ${table}`));
 await assert.rejects(reconcile()); await assert.rejects(verify());
 await assert.rejects(db.query("insert into daily_checkins(habit_details) values('{}')"));
 await assert.rejects(db.query("update daily_checkins set habit_details='{}'"));
 await assert.rejects(db.query('update users set reward_points=999'));
 await assert.rejects(db.query('update users set id=$1',[admin]));
 await assert.rejects(db.query('insert into reward_history values($1,current_date,900)',[member]));
}
await db.close();
console.log('PASS synthetic SQL: activation gates, configurable non-1:1 conversion, ownership/operator/expiry, one accepted scan, repeated credits once, decimal opening balance, pending preservation, delta corrections, highest workout, idempotent redemption, review hold, gym attribution, immutable records and client-role denial. PGlite is not a multi-connection concurrency load test.');
