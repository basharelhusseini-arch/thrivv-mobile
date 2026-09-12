import { createHash, randomBytes } from 'crypto';
export function gymCodeHash(value: unknown): string {
  if (typeof value !== 'string' || value.length > 40) throw new Error('Invalid gym code');
  const code = value.trim().replace(/[-\s]/g, '').toUpperCase();
  if (!/^[A-F0-9]{16}$/.test(code)) throw new Error('Invalid gym code');
  return createHash('sha256').update(code).digest('hex');
}
export function newGymCode() {
  const code = randomBytes(8).toString('hex').toUpperCase().match(/.{4}/g)!.join('-');
  return { code, hash: gymCodeHash(code) };
}
