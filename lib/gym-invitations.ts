import { createHash, randomBytes } from 'crypto';
export function invitationHash(token: string): string {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid invitation');
  return createHash('sha256').update(token).digest('hex');
}
export function newInvitation() {
  const token = randomBytes(32).toString('hex');
  return { token, hash: invitationHash(token) };
}
