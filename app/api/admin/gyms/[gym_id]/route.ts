import { NextRequest } from 'next/server';
import { actor, bodyOf, change, handled, json } from '@/lib/admin/http';
export async function PATCH(req: NextRequest, props: { params: Promise<{ gym_id: string }> }) {
  const params = await props.params;
  return handled(async () => {
    const user = await actor(); const b = await bodyOf(req);
    return json({ gym: await change(user.id, b, 'gym.edit', params.gym_id, b) });
  });
}
