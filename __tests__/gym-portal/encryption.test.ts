import { encryptGymCode, decryptGymCode } from '@/lib/gym-code-encryption';
import { newGymCode } from '@/lib/gym-codes';
const original = process.env.GYM_CODE_ENCRYPTION_KEY;
afterAll(() => { if (original === undefined) delete process.env.GYM_CODE_ENCRYPTION_KEY; else process.env.GYM_CODE_ENCRYPTION_KEY = original; });
beforeEach(() => { process.env.GYM_CODE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64'); });
test('persistent encrypted code decrypts only for the correct gym and hash', () => {
  const { code, hash } = newGymCode(); const sealed = encryptGymCode(code, 'gym-a');
  expect(sealed).not.toContain(code);
  expect(decryptGymCode(sealed, 'gym-a', hash)).toBe(code);
  expect(encryptGymCode(code, 'gym-a')).not.toBe(sealed);
  expect(() => decryptGymCode(sealed, 'gym-b', hash)).toThrow();
  expect(() => decryptGymCode(sealed, 'gym-a', '0'.repeat(64))).toThrow();
  const changed = Buffer.from(sealed, 'base64'); changed[changed.length - 1] ^= 1;
  expect(() => decryptGymCode(changed.toString('base64'), 'gym-a', hash)).toThrow();
});
test('missing/incorrect key fails without silently generating another key', () => {
  const { code, hash } = newGymCode(); const sealed = encryptGymCode(code, 'gym-a');
  process.env.GYM_CODE_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString('base64');
  expect(() => decryptGymCode(sealed, 'gym-a', hash)).toThrow();
  delete process.env.GYM_CODE_ENCRYPTION_KEY;
  expect(() => encryptGymCode(code, 'gym-a')).toThrow();
});
