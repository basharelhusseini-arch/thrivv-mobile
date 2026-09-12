// Isolated, synthetic fixtures. Test clock is substituted only in this rehearsal.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE gyms(id uuid PRIMARY KEY,name text,timezone text);
CREATE TABLE users(id uuid PRIMARY KEY,first_name text,last_name text,gym_id uuid,membership_start_date date,reward_points numeric DEFAULT 12);
CREATE TABLE health_scoring_config(version text PRIMARY KEY,effective_date date);
INSERT INTO health_scoring_config VALUES('health-v3','2026-09-01');
CREATE TABLE health_score_days(user_id uuid,date date,version text,gym_id uuid,timezone text,score numeric,training_score numeric,recovery_score numeric,habit_score numeric,complete boolean,PRIMARY KEY(user_id,date,version));
GRANT SELECT ON users,gyms,health_scoring_config,health_score_days TO service_role;
CREATE FUNCTION public.rehearsal_clock() RETURNS timestamptz LANGUAGE sql AS $$ SELECT current_setting('test.clock')::timestamptz $$;
SET test.clock='2026-09-16T12:00:00Z';`);
const sql=await readFile(new URL('../../supabase/migrations/20260912161426_weekly_health_leaderboard.sql',import.meta.url),'utf8');
await db.exec(sql.replaceAll('now()', 'public.rehearsal_clock()'));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const a=id(1),b=id(2),c=id(3),d=id(4),other=id(5),pending=id(6),outside=id(7),ga=id(100),gb=id(101);
await db.query("insert into gyms values($1,'Gym A','UTC'),($2,'Gym B','Asia/Dubai')",[ga,gb]);
for (const u of [a,b,c,d,other,pending,outside]) await db.query('insert into users(id,first_name,last_name,gym_id) values($1,$2,$3,$4)',[u,'Test','Member',u===other?gb:u===outside?null:ga]);
await db.query("update users set membership_start_date='2026-09-16' where id=$1",[d]);
const score=async(u,date,n,opts={})=>db.query(`insert into health_score_days values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
 on conflict(user_id,date,version) do update set score=excluded.score,training_score=excluded.training_score,recovery_score=excluded.recovery_score,habit_score=excluded.habit_score,complete=excluded.complete`,
 [u,date,opts.version||'health-v3',opts.gym||ga,opts.timezone||'UTC',opts.pending?null:n,n*.8,n*.15,n*.05,!opts.pending]);
await score(a,'2026-09-14',60);await score(a,'2026-09-15',40);await score(a,'2026-09-16',100,{pending:true});
await score(a,'2026-09-13',110);await score(a,'2026-09-17',110); // previous week and future excluded
await score(b,'2026-09-14',90);await score(b,'2026-09-15',110,{timezone:'Asia/Dubai'});
await score(b,'2026-09-16',110,{gym:gb}); // foreign tenant excluded
await score(c,'2026-09-14',100);await score(c,'2026-09-15',110,{version:'old'});
await score(d,'2026-09-14',110);await score(d,'2026-09-16',20); // membership date enforced
await score(other,'2026-09-14',110,{gym:gb,timezone:'Asia/Dubai'});
async function board(u) { await db.exec('SET ROLE service_role'); const result=(await db.query('select thrivv_weekly_health_leaderboard($1) as result',[u])).rows[0].result; await db.exec('RESET ROLE');return result; }
let result=await board(a);
assert.equal(result.weekStart,'2026-09-14');assert.equal(result.weekEnd,'2026-09-20');assert.equal(result.maxScore,770);
assert.deepEqual(result.leaderboard.map(r=>r.rank),[1,1,3,4]);
const row=result.leaderboard.find(r=>r.id===a);assert.equal(row.score,100);assert.equal(row.scored_days,2);assert.equal(row.training_score+row.recovery_score+row.habit_score,row.score);
assert.equal(result.leaderboard.find(r=>r.id===d).score,20);assert.equal(result.pendingCount,1);
assert.ok(!result.leaderboard.some(r=>r.id===other));assert.equal((await board(outside)).hasGym,false);
// Correcting a source day recomputes rather than appending extra points.
await score(a,'2026-09-14',50);assert.equal((await board(a)).leaderboard.find(r=>r.id===a).score,90);
// Current member remains visible below top ten.
for(let n=10;n<22;n++) {await db.query('insert into users(id,first_name,last_name,gym_id) values($1,$2,$3,$4)',[id(n),'High','Score',ga]);await score(id(n),'2026-09-14',110);}
result=await board(a);assert.equal(result.leaderboard.length,11);assert.ok(result.currentRank>10);assert.ok(result.leaderboard.some(r=>r.id===a));
// Monday reset depends on the gym's timezone, not server UTC.
await db.exec("SET test.clock='2026-09-20T22:30:00Z'");
assert.equal((await board(a)).weekStart,'2026-09-14');assert.equal((await board(other)).weekStart,'2026-09-21');assert.equal((await board(other)).rankedCount,0);
await db.exec("SET test.clock='2026-09-21T00:00:00Z'");assert.equal((await board(a)).rankedCount,0);
// Cutover prevents historical scoring from entering a newly activated board.
await db.exec("SET test.clock='2026-09-16T12:00:00Z'; UPDATE health_scoring_config SET effective_date='2026-09-16'");
assert.equal((await board(a)).rankedCount,1);
await db.exec('SET ROLE authenticated');await assert.rejects(db.query('select thrivv_weekly_health_leaderboard($1)',[a]));await db.exec('RESET ROLE; SET ROLE anon');await assert.rejects(db.query('select thrivv_weekly_health_leaderboard($1)',[a]));await db.exec('RESET ROLE');
assert.equal((await db.query('select count(*)::int as n from users where reward_points<>12')).rows[0].n,0);
await db.close();console.log('PASS: weekly totals, components, ties, missing days, corrections, top ten + current member, gym/timezone/version/membership/cutover boundaries, Monday reset and server-only access. Rewards unchanged.');
