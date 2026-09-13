import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(await readFile('supabase/migrations/20260913181537_revoked_app_sessions.sql', 'utf8'));
  await db.exec('SET ROLE service_role');
  await db.query('INSERT INTO revoked_app_sessions(token_hash) VALUES ($1)', ['a'.repeat(64)]);
  assert.equal((await db.query('SELECT * FROM revoked_app_sessions')).rows.length, 1);
  await assert.rejects(db.query('DELETE FROM revoked_app_sessions'));
  await assert.rejects(db.query("UPDATE revoked_app_sessions SET token_hash=$1", ['b'.repeat(64)]));
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`RESET ROLE; SET ROLE ${role}`);
    await assert.rejects(db.query('SELECT * FROM revoked_app_sessions'));
    await assert.rejects(db.query('INSERT INTO revoked_app_sessions(token_hash) VALUES ($1)', ['c'.repeat(64)]));
  }
  console.log('PASS revocation schema: service read/insert, no client access, no service undo.');
} finally { await db.close(); }
