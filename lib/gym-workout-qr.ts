import { SignJWT, jwtVerify } from 'jose';

export const QR_ROTATION_SECONDS = 30;
export const QR_LIFETIME_SECONDS = 60;
const audience = 'thrivv:gym-workout-display';
const issuer = 'thrivv';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function secret() {
  const value = process.env.GYM_WORKOUT_QR_SECRET;
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('QR setup required');
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length !== 32 || bytes.toString('base64') !== value) throw new Error('QR setup required');
  return bytes;
}
export async function createGymWorkoutQr(gymId: string, operatorId: string, now = Date.now()) {
  if (!uuid.test(gymId) || !uuid.test(operatorId)) throw new Error('Invalid QR identity');
  const issuedAt = Math.floor(now / 1000 / QR_ROTATION_SECONDS) * QR_ROTATION_SECONDS;
  const expiresAt = issuedAt + QR_LIFETIME_SECONDS;
  const token = await new SignJWT({ gym: gymId, purpose: 'workout-display', v: 1 })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuer(issuer).setAudience(audience)
    .setSubject(operatorId).setIssuedAt(issuedAt).setNotBefore(issuedAt).setExpirationTime(expiresAt).sign(secret());
  return { token, expiresAt: expiresAt * 1000, refreshAt: (issuedAt + QR_ROTATION_SECONDS) * 1000 };
}
/** Signature validation only. The member verification route and SQL transaction additionally
 * check current membership/operator permissions, workout eligibility and duplicates. */
export async function verifyGymWorkoutQr(token: string, gymId: string, now = Date.now()) {
  const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'], issuer, audience, currentDate: new Date(now), clockTolerance: 0 });
  if (payload.gym !== gymId || !uuid.test(gymId) || payload.purpose !== 'workout-display' || payload.v !== 1 ||
      !payload.sub || !uuid.test(payload.sub) || typeof payload.iat !== 'number' ||
      payload.nbf !== payload.iat || payload.exp !== payload.iat + QR_LIFETIME_SECONDS) throw new Error('Invalid workout QR');
  return { gymId, operatorId: payload.sub, issuedAt: payload.iat, expiresAt: payload.exp };
}
