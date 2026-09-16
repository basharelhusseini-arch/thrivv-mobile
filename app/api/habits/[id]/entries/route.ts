import { NextRequest } from 'next/server';
import { memberRecords as store } from '@/lib/member-records';
import { memberActor, memberBody, memberResult, owned, MemberResourceError } from '@/lib/member-resource';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, props: Context) {
  const params = await props.params;
  return memberResult(async () => {
    const user = await memberActor(req);
    owned(await store.getHabit(params.id, user.id), user.id);
    return (await store.getHabitEntries(params.id, user.id)).filter(entry => entry.memberId === user.id);
  });
}
export async function POST(req: NextRequest, props: Context) {
  const params = await props.params;
  return memberResult(async () => {
    const user = await memberActor(req);
    owned(await store.getHabit(params.id, user.id), user.id);
    const body = await memberBody(req, user.id);
    const parsedDate = typeof body.date === 'string' ? new Date(`${body.date}T00:00:00Z`) : null;
    if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !parsedDate || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== body.date || body.date > new Date().toISOString().slice(0, 10) || typeof body.completed !== 'boolean') {
      throw new MemberResourceError('Choose a valid date up to today and a completion status.', 400);
    }
    if ((body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 500)) || (body.unit !== undefined && (typeof body.unit !== 'string' || body.unit.length > 40)) || (body.value !== undefined && (typeof body.value !== 'number' || !Number.isFinite(body.value)))) {
      throw new MemberResourceError('Check the habit entry details.', 400);
    }
    return store.addHabitEntry({ memberId: user.id, habitId: params.id, date: body.date, completed: body.completed, notes: body.notes, value: body.value, unit: body.unit });
  }, 201);
}
