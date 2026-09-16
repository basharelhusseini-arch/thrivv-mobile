import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { checkGymAccess } from '@/lib/gym-auth';
import { createGymWorkoutQr } from '@/lib/gym-workout-qr';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' };
export async function GET(_req: NextRequest, props: { params: Promise<{ gym_id: string }> }) {
  const params = await props.params;
  const access = await checkGymAccess(params.gym_id);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status, headers });
  try {
    const code = await createGymWorkoutQr(params.gym_id, access.user.id);
    // Local generation only. No QR token is sent to an external rendering service.
    const svg = await QRCode.toString(`thrivv-workout:${code.token}`, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, width: 512 });
    return NextResponse.json({ image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, expiresAt: code.expiresAt, refreshAt: code.refreshAt, serverNow: Date.now() }, { headers });
  } catch {
    return NextResponse.json({ error: 'Workout QR is unavailable. Ask your platform administrator to complete QR setup.' }, { status: 503, headers });
  }
}
