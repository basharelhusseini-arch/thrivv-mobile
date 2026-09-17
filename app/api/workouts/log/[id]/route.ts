import { NextRequest } from 'next/server';
import { memberActor, memberBody, memberResult, MemberResourceError } from '@/lib/member-resource';
import { supabase } from '@/lib/supabase';
import { loggedWorkoutView, parseManualWorkoutInput } from '@/lib/manual-workouts';
export const dynamic = 'force-dynamic';
export async function PUT(req: NextRequest, props: { params: Promise<{id: string}> }) {
  return memberResult(async () => {
    const user = await memberActor(req);
    const body = await memberBody(req, user.id);
    if (body.expectedUserId !== user.id) throw new MemberResourceError('Your account changed. Refresh to continue.', 403);
    let input;
    try { input = parseManualWorkoutInput(body); } catch (e) { throw new MemberResourceError(e instanceof Error ? e.message : 'Invalid workout.', 400); }
    const {id} = await props.params;
    const { data, error } = await supabase.from('workouts').update(input).eq('id', id).eq('member_id', user.id)
      .is('workout_plan_id', null).eq('status', 'completed').select('id,member_id,name,date,exercises,completed_at').maybeSingle();
    if (error) throw new MemberResourceError('Unable to save changes. Please retry.', 503);
    if (!data) throw new MemberResourceError('Logged workout not found.', 404);
    return {workout: loggedWorkoutView(data)};
  });
}
