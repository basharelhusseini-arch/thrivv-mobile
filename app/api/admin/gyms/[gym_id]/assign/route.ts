import { NextRequest } from 'next/server';
import { actor, bodyOf, change, handled, HttpError, json, uuid } from '@/lib/admin/http';
export async function POST(req: NextRequest, props: { params: Promise<{ gym_id: string }> }) {
  const params = await props.params;
  return handled(async () => {
    const user = await actor(); const b = await bodyOf(req);
    if (!uuid(b.userId) || (params.gym_id !== 'none' && !uuid(params.gym_id))) throw new HttpError(400, 'Select a member and gym');
    return json({ user: await change(user.id, b, 'member.assign', b.userId, { gym_id: params.gym_id === 'none' ? null : params.gym_id, membership_start_date: b.membership_start_date }) });
  });
}
