import { supabase } from '@/lib/supabase';
import { NextRequest } from 'next/server';
import { memberRecords } from '@/lib/member-records';
import { memberActor, memberBody, memberResult, MemberResourceError } from '@/lib/member-resource';

async function owner(request: NextRequest, id: string) {
  const user = await memberActor(request);
  const { data, error } = await supabase.from('workouts').select('id').eq('id', id).eq('member_id', user.id).maybeSingle();
  if (error) throw new Error('Workout storage unavailable');
  if (!data) throw new MemberResourceError('Workout not found', 404);
  return user;
}
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  return memberResult(async () => {
    const { id } = await props.params;
    const user = await owner(request, id);
    return memberRecords.getWorkoutProgress(id, user.id);
  });
}
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  return memberResult(async () => {
    const { id } = await props.params;
    const user = await owner(request, id);
    const body = await memberBody(request, user.id);
    const { exerciseId, setsCompleted, repsCompleted, weightUsed, durationCompleted, restTimeActual, notes } = body;
    if (typeof exerciseId !== 'string' || !exerciseId.trim() || exerciseId.length > 200 || !Number.isInteger(setsCompleted) || setsCompleted < 0 || setsCompleted > 100) throw new MemberResourceError('Check the exercise and completed sets.', 400);
    for (const values of [repsCompleted, weightUsed]) {
      if (values !== undefined && (!Array.isArray(values) || values.length > 100 || values.some(v => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10000))) throw new MemberResourceError('Check the reps and weights.', 400);
    }
    for (const value of [durationCompleted, restTimeActual]) {
      if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 86400)) throw new MemberResourceError('Check the workout duration.', 400);
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 2000)) throw new MemberResourceError('Notes must be under 2,000 characters.', 400);
    return memberRecords.addWorkoutProgress({ workoutId: id, memberId: user.id, exerciseId, setsCompleted, repsCompleted, weightUsed, durationCompleted, restTimeActual, notes });
  }, 201);
}
