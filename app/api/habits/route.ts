import { NextRequest } from 'next/server';
import { memberRecords as store } from '@/lib/member-records';
import { memberActor, memberBody, memberResult } from '@/lib/member-resource';
import { habitFields } from '@/lib/habit-input';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return memberResult(async () => store.getMemberHabits((await memberActor(req)).id));
}
export async function POST(req: NextRequest) {
  return memberResult(async () => {
    const user = await memberActor(req);
    const fields = habitFields(await memberBody(req, user.id), true);
    return store.addHabit({ ...fields, memberId: user.id, name: fields.name!, category: fields.category!, frequency: fields.frequency!, status: 'active' });
  }, 201);
}
