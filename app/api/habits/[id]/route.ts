import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { memberActor, memberBody, memberResult, owned } from '@/lib/member-resource';
import { habitFields } from '@/lib/habit-input';
export const dynamic = 'force-dynamic';

type Context = { params: { id: string } };
export async function GET(req: NextRequest, { params }: Context) {
  return memberResult(async () => {
    const user = await memberActor(req);
    return owned(store.getHabit(params.id), user.id);
  });
}
export async function PUT(req: NextRequest, { params }: Context) {
  return memberResult(async () => {
    const user = await memberActor(req);
    owned(store.getHabit(params.id), user.id);
    return store.updateHabit(params.id, habitFields(await memberBody(req, user.id)));
  });
}
export async function DELETE(req: NextRequest, { params }: Context) {
  return memberResult(async () => {
    const user = await memberActor(req);
    owned(store.getHabit(params.id), user.id);
    store.deleteHabit(params.id);
    return { success: true };
  });
}
