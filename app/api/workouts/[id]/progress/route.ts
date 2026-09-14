import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({error:'Unauthorized'}, {status:401});
    const {data: workout} = await supabase.from('workouts').select('id').eq('id',params.id).eq('member_id',user.id).maybeSingle();
    if (!workout) return NextResponse.json({error:'Workout not found'}, {status:404});
    const progress = store.getWorkoutProgress(params.id);
    return NextResponse.json(progress.filter(p => p.memberId === user.id));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch workout progress' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({error:'Unauthorized'}, {status:401});
    const {data: workout} = await supabase.from('workouts').select('id').eq('id',params.id).eq('member_id',user.id).maybeSingle();
    if (!workout) return NextResponse.json({error:'Workout not found'}, {status:404});
    const body = await request.json();
    if (body.memberId && body.memberId !== user.id) return NextResponse.json({error:'Forbidden'}, {status:403});
    const memberId=user.id;
    const { exerciseId, setsCompleted, repsCompleted, weightUsed, durationCompleted, restTimeActual, notes } = body;

    if (!memberId || !exerciseId) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, exerciseId' },
        { status: 400 }
      );
    }

    const progress = store.addWorkoutProgress({
      workoutId: params.id,
      memberId,
      exerciseId,
      setsCompleted,
      repsCompleted,
      weightUsed,
      durationCompleted,
      restTimeActual,
      notes,
    });

    return NextResponse.json(progress, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save workout progress' }, { status: 500 });
  }
}
