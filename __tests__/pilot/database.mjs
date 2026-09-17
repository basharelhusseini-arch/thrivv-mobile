import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
const schema=JSON.parse(await readFile(new URL('../account-deletion/fixtures/schema.json',import.meta.url),'utf8'));
await db.exec(`SET TIME ZONE 'UTC'; CREATE SCHEMA auth; CREATE SCHEMA thrivv_private; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid'; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; GRANT USAGE ON SCHEMA thrivv_private TO service_role;`);
for(const t of schema.tables) await db.exec(`CREATE TABLE public."${t.name}" (${t.columns});`);
for(const c of schema.constraints) await db.exec(`ALTER TABLE public.${c.table_name.replace(/^public\./,'')} ADD CONSTRAINT "${c.conname}" ${c.definition};`);
await db.exec(await readFile(new URL('../../supabase/migrations/20260917134339_account_deletion.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20260917184334_pilot_scale_readiness.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20260917232708_member_experience_reliability.sql',import.meta.url),'utf8'));
console.log('PASS: forward migration compiles against the current schema snapshot.');
const ids=Array.from({length:8},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const [admin,a,b,g,g2,lease,lease2,req]=ids;
const scalar=async(sql,params=[]) => (await db.query(sql,params)).rows[0].value;
await db.exec(`
 INSERT INTO auth.users VALUES('${admin}'),('${a}'),('${b}');
 INSERT INTO gyms(id,name,owner_email,timezone) VALUES('${g}','Fixture branch','gym@example.test','UTC'),('${g2}','Other branch','other@example.test','UTC');
 INSERT INTO users(id,first_name,last_name,email,gym_id,membership_start_date,is_admin) VALUES
 ('${admin}','Fixture','Admin','admin@example.test','${g}',current_date-30,true),('${a}','Manual','Member','a@example.test','${g}',current_date-30,false),('${b}','WHOOP','Member','b@example.test','${g}',current_date-30,false);
 INSERT INTO gym_reward_config(singleton,verification_enabled,rewards_enabled,effective_date,manual_rewards_enabled,manual_effective_at) VALUES(true,true,false,current_date,true,now()-interval '1 hour');
 INSERT INTO daily_checkins(user_id,date,did_workout,habit_details) VALUES('${a}',current_date,true,'{}'),('${b}',current_date,true,'{}');
 INSERT INTO whoop_connections(id,whoop_connected_at,whoop_access_token,next_sync_at) VALUES('${b}',now(),'synthetic-token',now()-interval '1 hour');
 GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;
`);
const scan=async user=>scalar(`SELECT thrivv_private.verify_manual_workout($1,$2,$3,floor(extract(epoch FROM now()))::bigint,floor(extract(epoch FROM now()))::bigint+60,gen_random_uuid()) value`,[user,g,admin]);
assert.equal((await scan(a)).reward.awarded,40);
assert.equal((await scan(b)).reward.awarded,40);
await scan(b);
assert.equal(await scalar(`SELECT reward_points value FROM users WHERE id='${b}'`), '40.0');
assert.equal(await scalar(`SELECT count(*)::int value FROM reward_transactions WHERE user_id='${b}'`),1);
await db.exec(`UPDATE daily_checkins SET habit_details='{"sauna":true,"steamRoom":true,"iceBath":true,"coldShower":true,"meditation":true,"stretching":true,"extra":true}' WHERE user_id='${b}';`);
assert.equal((await scalar(`SELECT thrivv_reconcile_gym_reward('${b}',current_date) value`)).awarded,50);
assert.equal((await scalar(`SELECT thrivv_reconcile_gym_reward('${b}',current_date-1) value`)).status,'verification_required');
const board=await scalar(`SELECT thrivv_weekly_points_leaderboard('${a}') value`);
assert.equal(board.metric,'earned_points');assert.equal(board.leaderboard[0].id,b);assert.equal(board.leaderboard[1].id,a);
await db.exec(`UPDATE users SET reward_points=1000 WHERE id='${b}';`);
const create=async(id,gym)=>scalar(`SELECT thrivv_manage_reward($1,gen_random_uuid(),'create',$2,'Fixture setup',$3::jsonb) value`,[admin,id,JSON.stringify({name:'Fixture reward',partner_name:'Fixture merchant',category:'restaurant',terms:'Fixture terms',instructions:'Fixture instructions',expires_at:new Date(Date.now()+7*86400000).toISOString(),gym_id:gym})]);
await create('offer',g);await create('other',g2);
for(const id of ['offer','other']){
 await scalar(`SELECT thrivv_manage_reward($1,gen_random_uuid(),'codes',$2,'Fixture stock',$3::jsonb) value`,[admin,id,JSON.stringify({codes:[`${id}_A`,`${id}_B`,`${id}_C`]})]);
 await scalar(`SELECT thrivv_manage_reward($1,gen_random_uuid(),'active',$2,'Fixture approval','{"active":true,"partnerApproved":true}') value`,[admin,id]);
}
assert.equal((await scalar(`SELECT thrivv_reward_catalog('${b}',false) value`)).length,1);
await assert.rejects(scalar(`SELECT thrivv_redeem('${b}','other',gen_random_uuid()) value`),/branch/);
const receipt=await scalar(`SELECT thrivv_redeem('${b}','offer','${req}') value`);
assert.equal(receipt.gym_id,g);
assert.equal((await scalar(`SELECT thrivv_redeem('${b}','offer','${req}') value`)).id,receipt.id);
assert.equal((await scalar(`SELECT thrivv_weekly_points_leaderboard('${a}') value`)).leaderboard[0].score,50);
const resolve=async(action,request=crypto.randomUUID())=>scalar(`SELECT thrivv_resolve_redemption($1,$2,$3,$4,'Fixture reconciliation','TEST-MERCHANT-REF') value`,[admin,request,receipt.id,action]);
await resolve('rejected');await resolve('replace');
assert.notEqual(await scalar(`SELECT discount_code value FROM reward_redemptions WHERE id='${receipt.id}'`),receipt.discount_code);
assert.equal(await scalar(`SELECT count(*)::int value FROM reward_discount_codes WHERE redemption_id='${receipt.id}'`),2);
const refundRequest=crypto.randomUUID();await resolve('refund',refundRequest);await resolve('refund',refundRequest);
assert.equal(await scalar(`SELECT count(*)::int value FROM reward_transactions WHERE user_id='${b}' AND kind='redemption_refund'`),1);
await assert.rejects(resolve('refund'),/resolved/);
assert.equal(Number(await scalar(`SELECT reward_points value FROM users WHERE id='${b}'`)),1000);
assert.equal((await scalar(`SELECT thrivv_reward_catalog('${admin}',true) value`))[0].lowStock,true);
// Current and future jobs, overlapping leases and stale acknowledgements.
assert.equal((await db.query(`SELECT * FROM thrivv_claim_sync('${lease}',3)`)).rows.length,1);
assert.equal((await db.query(`SELECT * FROM thrivv_claim_sync('${lease2}',3)`)).rows.length,0);
await db.exec(`SELECT thrivv_finish_sync('${b}','${lease2}','ok');`);
assert.equal(await scalar(`SELECT sync_lease_id::text value FROM whoop_connections WHERE id='${b}'`),lease);
await db.exec(`SELECT thrivv_finish_sync('${b}','${lease}','upstream_or_import_failed');`);
assert.equal(await scalar(`SELECT sync_attempts value FROM whoop_connections WHERE id='${b}'`),1);
assert.equal(await scalar(`SELECT (next_sync_at>now()) value FROM whoop_connections WHERE id='${b}'`),true);
await db.exec(`UPDATE whoop_connections SET sync_attempts=6,next_sync_at=now()-interval '1 hour' WHERE id='${b}'`);
assert.equal((await scalar('SELECT thrivv_sync_overview() value')).paused,1);
assert.equal((await db.query(`SELECT * FROM thrivv_claim_sync('${lease}',3)`)).rows.length,0);
await db.exec(`SELECT thrivv_retry_sync('${admin}','${b}',gen_random_uuid(),'Fixture operator retry')`);
assert.equal((await db.query(`SELECT * FROM thrivv_claim_sync('${lease}',3)`)).rows.length,1);
// Analytics deduplicate member-days and never label an issued code as confirmed use.
let report=await scalar(`SELECT thrivv_gym_pilot_analytics('${g}',current_date-89) value`);
assert.equal(report.verifiedVisitDays,2);assert.equal(report.codesIssued,1);assert.equal(report.confirmedUse,0);assert.equal(report.refunded,1);assert.equal(report.week4Eligible,3);
assert.equal(report.week4Participating,0);
await db.exec(`INSERT INTO manual_gym_verifications(user_id,score_date,gym_id,timezone,operator_id,request_id) VALUES('${a}',current_date-4,'${g}','UTC','${admin}',gen_random_uuid())`);
report=await scalar(`SELECT thrivv_gym_pilot_analytics('${g}',current_date-89) value`);
assert.equal(report.week4Participating,1);assert.equal(report.repeatVisitors,1);
// Preferences default off; affordable reminders exclude refunded-code duplication correctly.
assert.deepEqual((await scalar(`SELECT thrivv_member_reminders('${b}') value`)).reminders,[]);
await db.exec(`INSERT INTO member_reminder_preferences(user_id,available_rewards,voucher_expiry,weekly_target) VALUES('${b}',true,true,3)`);
const reminders=await scalar(`SELECT thrivv_member_reminders('${b}') value`);
assert.equal(reminders.preferences.weekly_target,3);assert.equal(reminders.reminders.some(r=>r.id.startsWith('weekly:')),true);
await db.exec(`UPDATE gym_reward_config SET manual_rewards_enabled=false,rewards_enabled=false`);
assert.deepEqual(await scalar(`SELECT thrivv_reward_catalog('${a}',false) value`),[]);
assert.equal((await scalar(`SELECT thrivv_reward_catalog('${admin}',true) value`)).length,2);
await db.exec(`UPDATE gym_reward_config SET manual_rewards_enabled=true; UPDATE gyms SET timezone='Asia/Beirut' WHERE id='${g}'`);
const localReminders=await scalar(`SELECT thrivv_member_reminders('${b}') value`);
for (const scheduled of localReminders.scheduled.filter(r=>r.kind==='weekly')) {
 assert.equal(await scalar(`SELECT extract(hour FROM $1::timestamptz AT TIME ZONE 'Asia/Beirut')::int value`,[scheduled.at]),18);
 assert.equal(await scalar(`SELECT extract(isodow FROM $1::timestamptz AT TIME ZONE 'Asia/Beirut')::int value`,[scheduled.at]),6);
}
// Member summaries deduplicate daily visits and count only recognised habit activity.
const activity=await scalar(`SELECT thrivv_member_activity('${b}',current_date) value`);
assert.equal(activity.visits,1);assert.equal(activity.weekDays,1);assert.equal(activity.todayHabits,6);assert.equal(activity.habitDays,1);
const issueQueue=await scalar(`SELECT thrivv_operation_queue(0,50) value`);
assert.ok(issueQueue.issues.some(i=>i.kind==='stock'));
assert.ok(issueQueue.issues.every((i,n,all)=>n===0||all[n-1].priority<=i.priority));
await scalar(`SELECT thrivv_record_runtime_error('fixture','server','/api/workouts','TypeError') value`);
await scalar(`SELECT thrivv_record_runtime_error('fixture','server','/api/workouts','TypeError') value`);
assert.equal(await scalar(`SELECT occurrences::int value FROM runtime_errors WHERE fingerprint='fixture'`),2);
assert.equal((await scalar(`SELECT thrivv_operation_queue(0,1) value`)).issues.length,1);
assert.equal(await scalar(`SELECT thrivv_claim_operation_alert('fixture','${lease}') value`),true);
assert.equal(await scalar(`SELECT thrivv_claim_operation_alert('fixture','${lease2}') value`),false);
await scalar(`SELECT thrivv_finish_operation_alert('fixture','${lease2}',true) value`);
assert.equal(await scalar(`SELECT sent_at value FROM operation_alert_deliveries WHERE fingerprint='fixture'`),null);
await scalar(`SELECT thrivv_finish_operation_alert('fixture','${lease}',false) value`);
assert.equal(await scalar(`SELECT thrivv_claim_operation_alert('fixture','${lease2}') value`),true);
await scalar(`SELECT thrivv_finish_operation_alert('fixture','${lease2}',true) value`);
assert.equal(await scalar(`SELECT thrivv_claim_operation_alert('fixture','${lease}') value`),false);
console.log('PASS: full member activity, issue prioritisation, telemetry aggregation and alert delivery lease/retry/deduplication.');
// Server-only access: no caller-selected identity may be used directly by a browser.
await db.exec('SET ROLE anon');
for(const sql of [`SELECT thrivv_weekly_points_leaderboard('${a}')`,`SELECT thrivv_reward_catalog('${a}',false)`,`SELECT thrivv_gym_pilot_analytics('${g}')`,`SELECT thrivv_member_reminders('${a}')`,`SELECT thrivv_claim_sync('${lease}',3)`,`SELECT thrivv_member_activity('${a}',current_date)`,`SELECT thrivv_operation_queue()`,`SELECT * FROM runtime_errors`,`SELECT thrivv_claim_operation_alert('x','${lease}')`])await assert.rejects(db.query(sql),/permission denied/);
await db.exec('RESET ROLE; SET ROLE service_role');
assert.equal((await scalar(`SELECT thrivv_weekly_points_leaderboard('${a}') value`)).hasGym,true);
await db.exec('RESET ROLE');
// Account deletion still removes new preferences and all allocated replacement codes atomically.
await db.exec(`DELETE FROM auth.users WHERE id='${b}'`);
assert.equal(await scalar(`SELECT count(*)::int value FROM member_reminder_preferences WHERE user_id='${b}'`),0);
assert.equal(await scalar(`SELECT count(*)::int value FROM reward_discount_codes WHERE redemption_id='${receipt.id}'`),0);
console.log('PASS: shared awards, cap, scan retries, mixed ranks, spending independence, branch eligibility, replacement/refund idempotency, lease fencing/backoff, report cohorts, reminder consent, role permissions and account deletion.');

await db.close();
