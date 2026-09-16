import { NextRequest, NextResponse } from 'next/server';
import { checkGymAccess } from '@/lib/gym-auth';
import { gymActivityData, nonnegativeOffset } from '@/lib/gym-operations-data';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, props: { params: Promise<{ gym_id: string }> }) {
  const params = await props.params;
  const access = await checkGymAccess(params.gym_id);
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status, headers });
  try {
    const requestedTime = Date.parse(request.nextUrl.searchParams.get('through') || '');
    const through = new Date(Number.isFinite(requestedTime) ? Math.min(requestedTime, Date.now()) : Date.now()).toISOString();
    return NextResponse.json(await gymActivityData(params.gym_id, { manual: nonnegativeOffset(request.nextUrl.searchParams.get('manual')), whoop: nonnegativeOffset(request.nextUrl.searchParams.get('whoop')) }, through), { headers });
  } catch {
    return NextResponse.json({ error: 'Verified activity unavailable. Please retry.' }, { status: 503, headers });
  }
}
