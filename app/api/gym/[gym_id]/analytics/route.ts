import { NextRequest, NextResponse } from 'next/server';
import { checkGymAccess } from '@/lib/gym-auth';
import { gymDashboardData } from '@/lib/gym-dashboard-data';
export const dynamic = 'force-dynamic';
export async function GET(_request: NextRequest, props: { params: Promise<{ gym_id: string }> }) {
  const params = await props.params;
  const access = await checkGymAccess(params.gym_id);
  const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' };
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status, headers });
  try {
    return NextResponse.json(await gymDashboardData(access.gym, access.isAdmin, access.isOwner), { headers });
  } catch {
    return NextResponse.json({ error: 'Gym analytics unavailable. Please retry.' }, { status: 503, headers });
  }
}
