import { NextRequest } from 'next/server';
import { memberRecords as store } from '@/lib/member-records';
import { memberActor, memberBody, memberResult, owned } from '@/lib/member-resource';
import { habitFields } from '@/lib/habit-input';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, props: Context) {
  const params = await props.params;
  return memberResult(async () => {
    const user = await memberActor(req);
    return owned(await store.getHabit(params.id, user.id), user.id);
  });
}
export async function PUT(req: NextRequest, props: Context) {
  const params = await props.params;
  return memberResult(async () => {
    const user = await memberActor(req);
    owned(await store.getHabit(params.id, user.id), user.id);
    return store.updateHabit(params.id, habitFields(await memberBody(req, user.id)), user.id);
  });
}
export async function DELETE(req: NextRequest, props: Context) {
  const params = await props.params;
  return memberResult(async () => {
    const user = await memberActor(req);
    owned(await store.getHabit(params.id, user.id), user.id);
    await store.deleteHabit(params.id, user.id);
    return { success: true };
  });
}
