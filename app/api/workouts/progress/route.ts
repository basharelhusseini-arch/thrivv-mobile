import { NextRequest } from 'next/server';
import { memberActor, memberResult, MemberResourceError } from '@/lib/member-resource';
import { supabase } from '@/lib/supabase';
import { loggedWorkoutView, workoutProgress, type LoggedWorkout } from '@/lib/manual-workouts';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return memberResult(async () => {
    const user = await memberActor(req);
    if (req.nextUrl.searchParams.get('expectedUserId') !== user.id) throw new MemberResourceError('Your account changed. Refresh to continue.', 403);
    const exclude = req.nextUrl.searchParams.get('exclude');
    const before = req.nextUrl.searchParams.get('before');
    const workouts: LoggedWorkout[] = [];
    // Range through the entire saved log: Supabase's default row cap must not define a PB.
    for (let offset = 0; ; offset += 500) {
      let query = supabase.from('workouts').select('id,member_id,name,date,exercises,completed_at')
        .eq('member_id', user.id).is('workout_plan_id', null).eq('status', 'completed');
      if (exclude) query = query.neq('id', exclude);
      if (before && /^\d{4}-\d{2}-\d{2}$/.test(before)) query = query.lte('date', before);
      const { data, error } = await query.order('date', { ascending: false }).order('completed_at', { ascending: false }).order('id').range(offset, offset + 499);
      if (error) throw new MemberResourceError('Workout progress unavailable. Please retry.', 503);
      workouts.push(...(data || []).map(loggedWorkoutView));
      if (!data || data.length < 500) break;
    }
    return { progress: workoutProgress(workouts) };
  });
}
