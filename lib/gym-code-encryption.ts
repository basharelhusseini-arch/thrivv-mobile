import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { gymCodeHash } from './gym-codes';

function key(): Buffer {
  const value = process.env.GYM_CODE_ENCRYPTION_KEY || '';
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length !== 32 || bytes.toString('base64') !== value) throw new Error('Gym code encryption is not configured');
  return bytes;
}
/** AES-256-GCM. Bind ciphertext to its gym so rows cannot be swapped. Server use only. */
export function encryptGymCode(code: string, gymId: string): string {
  gymCodeHash(code);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(`gym-code:v1:${gymId}`));
  const ciphertext = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}
export function decryptGymCode(envelope: string, gymId: string, expectedHash: string): string {
  const bytes = Buffer.from(envelope, 'base64');
  if (bytes.length < 29) throw new Error('Invalid gym code envelope');
  const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(`gym-code:v1:${gymId}`));
  decipher.setAuthTag(bytes.subarray(12, 28));
  const code = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
  if (gymCodeHash(code) !== expectedHash) throw new Error('Gym code mismatch');
  return code;
}
