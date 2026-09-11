import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { scoreSnapshot } from '@/lib/daily-health-score';
export async function GET() {
  try { const user = await requireAuth(); return NextResponse.json(await scoreSnapshot(user.id)); }
  catch (e) { return NextResponse.json({ error: 'Unable to load score' }, { status: e instanceof Error && e.message === 'Unauthorized' ? 401 : 503 }); }
}
