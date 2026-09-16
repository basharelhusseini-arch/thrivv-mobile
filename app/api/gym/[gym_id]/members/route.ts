import { NextRequest, NextResponse } from 'next/server';
import { checkGymAccess } from '@/lib/gym-auth';
import { gymMembersData, nonnegativeOffset } from '@/lib/gym-operations-data';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, props: { params: Promise<{ gym_id: string }> }) {
  const params = await props.params;
  const access = await checkGymAccess(params.gym_id);
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status, headers });
  try {
    return NextResponse.json(await gymMembersData(params.gym_id, request.nextUrl.searchParams.get('q') || '', nonnegativeOffset(request.nextUrl.searchParams.get('offset'))), { headers });
  } catch {
    return NextResponse.json({ error: 'Member list unavailable. Please retry.' }, { status: 503, headers });
  }
}
