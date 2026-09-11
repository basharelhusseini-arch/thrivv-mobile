import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { scoreSnapshot } from '@/lib/daily-health-score';
export async function GET() {
  try { const user = await requireAuth(); const snapshot = await scoreSnapshot(user.id);
    return NextResponse.json({ ...snapshot, scores: snapshot.history, days: 7 }); }
  catch (e) { return NextResponse.json({ error: 'Unable to load history' }, { status: e instanceof Error && e.message === 'Unauthorized' ? 401 : 503 }); }
}
