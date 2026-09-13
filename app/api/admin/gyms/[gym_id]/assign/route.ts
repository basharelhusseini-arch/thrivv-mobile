import { NextRequest } from 'next/server';
import { actor, bodyOf, change, handled, HttpError, json, uuid } from '@/lib/admin/http';
export function POST(req: NextRequest, { params }: { params: { gym_id: string } }) { return handled(async () => {
  const user = await actor(); const b = await bodyOf(req);
  if (!uuid(b.userId) || (params.gym_id !== 'none' && !uuid(params.gym_id))) throw new HttpError(400, 'Select a member and gym');
  return json({ user: await change(user.id, b, 'member.assign', b.userId, { gym_id: params.gym_id === 'none' ? null : params.gym_id, membership_start_date: b.membership_start_date }) });
}); }
