import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create table risk_events(id int primary key);create table device_registry(id int primary key);
insert into risk_events values(1);insert into device_registry values(2);
grant all on risk_events,device_registry to anon,authenticated,service_role;`);
await db.exec(await readFile('supabase/migrations/20260914131533_private_risk_storage.sql','utf8'));
const {rows}=await db.query(`select c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') as anon,has_table_privilege('authenticated',c.oid,'INSERT') as client_insert,has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE') as server from pg_class c where c.relname in ('risk_events','device_registry')`);
assert.equal(rows.length,2);for(const r of rows){assert(r.relrowsecurity);assert(!r.anon);assert(!r.client_insert);assert(r.server);}
assert.equal((await db.query('select count(*) from risk_events')).rows[0].count,1);
assert.equal((await db.query('select count(*) from device_registry')).rows[0].count,1);
await db.close();console.log('Private risk storage: RLS enabled, client access denied, server grants and all records preserved.');
