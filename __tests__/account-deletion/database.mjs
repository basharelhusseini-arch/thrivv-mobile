// Schema-only snapshot from production (no member data). PGlite runs locally.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const schema = JSON.parse(await readFile(new URL('./fixtures/schema.json', import.meta.url), 'utf8'));
await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid'; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;`);
for (const t of schema.tables) await db.exec(`CREATE TABLE public."${t.name}" (${t.columns});`);
for (const c of schema.constraints) await db.exec(`ALTER TABLE public.${c.table_name.replace(/^public\./,'')} ADD CONSTRAINT "${c.conname}" ${c.definition};`);
await db.exec(await readFile(new URL('../../supabase/migrations/20260917134339_account_deletion.sql', import.meta.url), 'utf8'));
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002', g='00000000-0000-4000-8000-000000000003';
await db.exec(`
INSERT INTO auth.users VALUES('${a}'),('${b}');
INSERT INTO public.gyms(id,name,owner_email) VALUES('${g}','Test gym','a@example.test');
INSERT INTO public.users(id,first_name,last_name,email,gym_id) VALUES('${a}','A','Test','a@example.test','${g}'),('${b}','B','Test','b@example.test','${g}');
INSERT INTO public.gym_operators(gym_id,user_id,assigned_by) VALUES('${g}','${a}','${a}'),('${g}','${b}','${a}');
INSERT INTO public.manual_gym_verifications(user_id,score_date,gym_id,timezone,operator_id,request_id) VALUES('${a}',current_date,'${g}','UTC','${b}',gen_random_uuid()),('${b}',current_date,'${g}','UTC','${a}',gen_random_uuid());
INSERT INTO public.workout_plans(id,member_id,name,goal,duration,frequency,difficulty,start_date) VALUES('plan-a','${a}','Plan','strength',4,3,'beginner',current_date),('plan-b','${b}','Plan','strength',4,3,'beginner',current_date);
INSERT INTO public.workouts(id,member_id,workout_plan_id,name,date) VALUES('a','${a}','plan-a','Workout',current_date),('b','${b}','plan-b','Workout',current_date),('manual','${a}',NULL,'Workout',current_date);
INSERT INTO public.whoop_connections(id,whoop_access_token) VALUES('${a}','synthetic-token');
INSERT INTO public.daily_checkins(user_id,date) VALUES('${a}',current_date),('${b}',current_date);
INSERT INTO public.reward_offers(id,name,points) VALUES('offer','Offer',10);
INSERT INTO public.reward_redemptions(id,user_id,offer_id,request_id,points) VALUES('${a}','${a}','offer',gen_random_uuid(),10),('${b}','${b}','offer',gen_random_uuid(),10);
INSERT INTO public.reward_discount_codes(offer_id,code,redemption_id) VALUES('offer','CONSUMED_A','${a}'),('offer','CONSUMED_B','${b}'),('offer','AVAILABLE',NULL);
INSERT INTO public.support_tickets(id,user_id,request_key,subject) VALUES('${a}','${a}',gen_random_uuid(),'Help'),('${b}','${b}',gen_random_uuid(),'Help');
INSERT INTO public.support_messages(ticket_id,author_id,author_role,request_key,body) VALUES('${a}','${b}','admin',gen_random_uuid(),'reply'),('${b}','${a}','admin',gen_random_uuid(),'personal reply'),('${b}','${b}','requester',gen_random_uuid(),'my message');
`);
// Unexpected foreign-key blocker must roll back every cleanup, including Auth.
await db.exec(`CREATE TABLE deletion_blocker(user_id uuid REFERENCES public.users(id)); INSERT INTO deletion_blocker VALUES('${a}');`);
await assert.rejects(db.exec(`DELETE FROM auth.users WHERE id='${a}'`));
assert.equal((await db.query(`SELECT count(*)::int n FROM public.workouts WHERE member_id='${a}'`)).rows[0].n,2);
assert.equal((await db.query(`SELECT count(*)::int n FROM auth.users WHERE id='${a}'`)).rows[0].n,1);
await db.exec('DROP TABLE deletion_blocker; CREATE ROLE supabase_auth_admin; GRANT USAGE ON SCHEMA auth TO supabase_auth_admin; GRANT SELECT, DELETE ON auth.users TO supabase_auth_admin; SET ROLE supabase_auth_admin');
await db.exec(`DELETE FROM auth.users WHERE id='${a}'`);
await db.exec('RESET ROLE');
await assert.rejects(db.exec(`INSERT INTO public.users(id,first_name,last_name,email) VALUES('${a}','Late','Login','late@example.test')`));
for (const [table,column] of [['users','id'],['workouts','member_id'],['workout_plans','member_id'],['daily_checkins','user_id'],['whoop_connections','id'],['support_tickets','user_id'],['reward_redemptions','user_id']]) {
 assert.equal((await db.query(`SELECT count(*)::int n FROM public.${table} WHERE ${column}='${a}'`)).rows[0].n,0,table);
}
assert.equal((await db.query('SELECT count(*)::int n FROM public.gyms')).rows[0].n,1);
assert.equal((await db.query(`SELECT count(*)::int n FROM public.workouts WHERE member_id='${b}'`)).rows[0].n,1);
assert.equal((await db.query(`SELECT count(*)::int n FROM public.gym_operators WHERE user_id='${b}' AND assigned_by IS NULL`)).rows[0].n,1);
assert.equal((await db.query(`SELECT count(*)::int n FROM public.manual_gym_verifications WHERE user_id='${b}' AND operator_id IS NULL`)).rows[0].n,1);
assert.equal((await db.query(`SELECT count(*)::int n FROM public.support_messages WHERE ticket_id='${b}'`)).rows[0].n,2);
assert.deepEqual((await db.query('SELECT code FROM public.reward_discount_codes ORDER BY code')).rows.map(r=>r.code),['AVAILABLE','CONSUMED_B']);
await assert.rejects(db.exec(`INSERT INTO public.workouts(id,member_id,name,date) VALUES('late','${a}','Late request',current_date)`));
await db.exec(`INSERT INTO public.workouts(id,member_id,name,date) VALUES('valid','${b}','Valid request',current_date)`);
await db.exec(`SET ROLE anon`);
await assert.rejects(db.query('SELECT public.thrivv_account_deletion_ready()'));
await db.exec('RESET ROLE; SET ROLE service_role');
assert.equal((await db.query('SELECT public.thrivv_account_deletion_ready() ready')).rows[0].ready,true);
await db.exec('RESET ROLE; ALTER TABLE auth.users DISABLE TRIGGER thrivv_before_auth_account_delete');
assert.equal((await db.query('SELECT public.thrivv_account_deletion_ready() ready')).rows[0].ready,false);
await db.close();
console.log('PASS: atomic deletion, rollback, member isolation, staff history, codes, late writes, readiness and permissions.');
