import { NextRequest } from 'next/server';
import { actor, bodyOf, handled, HttpError, json, uuid } from '@/lib/admin/http';
import { gymRewardStatus } from '@/lib/gym-reward-status';
import { verifyGymWorkoutQr } from '@/lib/gym-workout-qr';
import { scoreContext } from '@/lib/daily-health-score';
import { reconcileDailyReward } from '@/lib/rewards/ledger';
import { supabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export async function GET() { return handled(async () => { const user = await actor(false); return json(await gymRewardStatus(user.id)); }); }
export async function POST(req: NextRequest) { return handled(async () => {
  const user = await actor(false); const b = await bodyOf(req);
  if (process.env.GYM_WORKOUT_VERIFICATION_ENABLED !== 'true') throw new HttpError(503, 'Workout verification is not activated');
  if (!uuid(b.workoutId) || typeof b.qr !== 'string' || b.qr.length > 2048 || !b.qr.startsWith('thrivv-workout:') || Object.keys(b).some(k => !['workoutId','qr','requestId'].includes(k))) throw new HttpError(400, 'Scan a Thrivv workout QR');
  const context = await scoreContext(user.id);
  if (!context.gymId) throw new HttpError(403, 'Join your gym before verifying a workout');
  let verified;
  try { verified = await verifyGymWorkoutQr(b.qr.slice('thrivv-workout:'.length), context.gymId); }
  catch { throw new HttpError(400, 'QR expired or belongs to another gym. Scan the current code.'); }
  const { data, error } = await supabase.rpc('thrivv_verify_gym_workout', { p_user: user.id, p_workout: b.workoutId, p_gym: context.gymId,
    p_operator: verified.operatorId, p_issued: verified.issuedAt, p_expires: verified.expiresAt, p_request: b.requestId });
  if (error) throw new HttpError(409, 'Verification not accepted. Check your gym, workout and two-hour scan window, then retry.');
  // The accepted scan persists if accounting is temporarily unavailable. Future syncs retry it.
  let reward;
  try { reward = await reconcileDailyReward(user.id, data.date); }
  catch { reward = { status: 'retry_pending' }; }
  return json({ verified: true, reward });
}); }
