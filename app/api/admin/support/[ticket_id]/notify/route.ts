import { NextRequest } from 'next/server';
import { actor, bodyOf, change, handled, HttpError, json, uuid } from '@/lib/admin/http';
import { notifySupport } from '@/lib/support-email';
export function POST(req: NextRequest, { params }: { params: { ticket_id: string } }) { return handled(async () => {
  const user = await actor(); const b = await bodyOf(req); if (!uuid(params.ticket_id)) throw new HttpError(400, 'Invalid ticket');
  await change(user.id, { ...b, reason: 'Retry support email notification' }, 'support.notify', params.ticket_id, {});
  return json({ notification: await notifySupport(params.ticket_id) });
}); }
