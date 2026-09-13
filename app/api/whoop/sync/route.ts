import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { withWhoopLock, SyncBusyError } from '@/lib/whoop/sync';
import { syncDaily } from '@/lib/whoop/sync-daily';

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireAuth(); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try { return await withWhoopLock(user.id, () => syncDaily(request, user.id)); }
  catch (error) {
    return NextResponse.json({ error: error instanceof SyncBusyError ? 'Sync already running' : 'Sync failed; retry shortly' },
      { status: error instanceof SyncBusyError ? 409 : 503 });
  }
}
