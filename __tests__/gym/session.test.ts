import { createSession, verifySession } from '@/lib/auth';
const user = { id:'00000000-0000-4000-8000-000000000001', email:'member@example.test', firstName:'Test', lastName:'Member' };
const original = process.env.JWT_SECRET;
afterEach(() => { if (original === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original; });
test('configured sessions still round-trip', async () => {
  process.env.JWT_SECRET = 'synthetic-test-secret';
  expect((await verifySession(await createSession(user)))?.user).toEqual(user);
});
test('missing secret cannot issue a placeholder-signed session', async () => {
  delete process.env.JWT_SECRET;
  await expect(createSession(user)).rejects.toThrow('JWT_SECRET');
});
test('wrong signing secret is rejected', async () => {
  process.env.JWT_SECRET = 'synthetic-test-secret';
  const token = await createSession(user);
  process.env.JWT_SECRET = 'different-synthetic-secret';
  expect(await verifySession(token)).toBeNull();
});
