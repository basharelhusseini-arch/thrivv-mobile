import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { memberActor, memberBody, memberResult, owned, MemberResourceError } from '@/lib/member-resource';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { return memberResult(async () => store.getMemberHabitEntries((await memberActor(req)).id)); }
