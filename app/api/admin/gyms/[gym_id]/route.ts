import { NextRequest } from 'next/server';
import { actor, bodyOf, change, handled, json } from '@/lib/admin/http';
export function PATCH(req: NextRequest, { params }: { params: { gym_id: string } }) { return handled(async () => {
  const user = await actor(); const b = await bodyOf(req);
  return json({ gym: await change(user.id, b, 'gym.edit', params.gym_id, b) });
}); }
