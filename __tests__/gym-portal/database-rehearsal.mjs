// Isolated synthetic schema. Never point this script at a remote database.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE gyms(id uuid PRIMARY KEY,name text,timezone text);
CREATE TABLE users(id uuid PRIMARY KEY,first_name text,last_name text,gym_id uuid,membership_start_date date,reward_points numeric);
CREATE TABLE health_score_days(user_id uuid,date date,gym_id uuid,timezone text);
GRANT ALL ON users,gyms,health_score_days TO service_role;`);
await db.exec(await readFile(new URL('../../supabase/migrations/20260912155728_member_gym_codes.sql',import.meta.url),'utf8'));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const admin=id(1),operator=id(2),member=id(3),ga=id(10),gb=id(11),hash='a'.repeat(64);
await db.query("insert into users values($1,'Admin','Test',NULL,NULL,12.345,true),($2,'Operator','Test',NULL,NULL,5,false),($3,'Member','Test',NULL,NULL,0,false)",[admin,operator,member]);
await db.query("insert into gyms values($1,'Gym A','UTC'),($2,'Gym B','UTC')",[ga,gb]);
await db.query('insert into gym_join_codes(gym_id,code_hash,created_by) values($1,$2,$3)',[ga,hash,admin]);
await db.exec(await readFile(new URL('../../supabase/migrations/20260912174953_gym_portal_access_and_codes.sql',import.meta.url),'utf8'));
assert.equal((await db.query('select count(*)::int as n from gym_operators')).rows[0].n,0);
const old=(await db.query('select code_hash,code_ciphertext from gym_join_codes')).rows[0];assert.equal(old.code_hash,hash);assert.equal(old.code_ciphertext,null);
await db.exec('SET ROLE service_role');
const assign=(actor,g,u,grant)=>db.query('select thrivv_set_gym_operator($1,$2,$3,$4)',[actor,g,u,grant]);
await assert.rejects(assign(operator,ga,member,true));
await Promise.all(Array.from({length:8},()=>assign(admin,ga,operator,true)));
assert.equal((await db.query('select count(*)::int as n from gym_operators')).rows[0].n,1);
await assign(admin,gb,operator,true);await assign(admin,ga,operator,false);
assert.deepEqual((await db.query('select gym_id from gym_operators where user_id=$1',[operator])).rows.map(r=>r.gym_id),[gb]);
// Original hash-based joining still works after migration, without automatic code rotation.
assert.equal((await db.query('select thrivv_join_gym_code($1,$2) as r',[member,hash])).rows[0].r.gym.id,ga);
await db.query('update gym_join_codes set code_ciphertext=$1,code_encryption_version=1 where gym_id=$2',['synthetic-envelope',ga]);
for(const role of ['anon','authenticated']) {
 await db.exec(`RESET ROLE; SET ROLE ${role}`);
 for(const sql of ['select * from gym_operators','select code_ciphertext from gym_join_codes',`insert into gym_operators(gym_id,user_id,assigned_by) values('${ga}','${member}','${admin}')`,`select thrivv_set_gym_operator('${admin}','${ga}','${member}',true)`,'update users set is_admin=true']) await assert.rejects(db.query(sql));
}
await db.exec('RESET ROLE');
assert.equal((await db.query('select sum(reward_points) as total from users')).rows[0].total,'17.345');
assert.equal((await db.query('select is_admin from users where id=$1',[operator])).rows[0].is_admin,false);
await db.close();
console.log('PASS: protected operator assignment/revocation, repeat submissions, gym boundaries, unchanged hashes/joining/balances, encrypted-column restrictions. PGlite is not a multi-connection load test.');
