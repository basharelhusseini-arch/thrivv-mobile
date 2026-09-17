import { NextRequest } from 'next/server';
import { memberActor, memberResult, MemberResourceError } from '@/lib/member-resource';
import { scoreContext } from '@/lib/daily-health-score';
import { supabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return memberResult(async () => {
    const user = await memberActor(req);
    const context = await scoreContext(user.id);
    const {data, error} = await supabase.rpc('thrivv_member_activity', {p_user:user.id, p_today:context.today});
    if (error) throw new MemberResourceError('Activity unavailable. Please retry.', 503);
    return data;
  });
}
