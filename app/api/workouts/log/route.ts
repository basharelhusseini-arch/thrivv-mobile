import {recordProductionError} from '@/lib/error-reporting';
import { uuid } from '@/lib/admin/http';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { loggedWorkoutView, parseManualWorkoutInput } from '@/lib/manual-workouts';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
const columns = 'id,member_id,name,date,exercises,completed_at';
const failure = async (error: string, status: number) => {
  if(status>=500) await recordProductionError('server','/api/workouts/log',new Error());
  return NextResponse.json({ error }, { status, headers });
};

function crossOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return request.headers.get('sec-fetch-site') === 'cross-site'
    || Boolean(origin && origin !== request.nextUrl.origin);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return failure('Please sign in to view your workouts.', 401);
    const expectedUserId = request.nextUrl.searchParams.get('expectedUserId');
    const memberId = request.nextUrl.searchParams.get('memberId');
    if ((expectedUserId !== null && expectedUserId !== user.id)
      || (memberId !== null && memberId !== user.id)) {
      return failure('Your account changed. Refresh before continuing.', 403);
    }
    const offset = Number(request.nextUrl.searchParams.get('offset') || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000000) return failure('Invalid page.', 400);
    const { data, error } = await supabase.from('workouts').select(columns)
      .eq('member_id', user.id).is('workout_plan_id', null).eq('status', 'completed')
      .order('date', { ascending: false }).order('completed_at', { ascending: false }).order('id').range(offset, offset + 49);
    if (error) return failure('Your workout history could not be loaded. Please retry.', 503);
    return NextResponse.json({ workouts: (data || []).map(loggedWorkoutView), hasMore: data?.length === 50 }, { headers });
  } catch {
    return failure('Your workout history could not be loaded. Please retry.', 503);
  }
}

export async function POST(request: NextRequest) {
  if (crossOrigin(request)) return failure('Invalid request origin.', 403);
  try {
    const user = await getCurrentUser();
    if (!user) return failure('Please sign in to save your workout.', 401);

    const text = await request.text();
    if (text.length > 32000) return failure('This workout is too large.', 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { return failure('Unable to read this workout.', 400); }
    if (body && typeof body === 'object') {
      const submitted = body as Record<string, unknown>;
      if ((submitted.expectedUserId !== undefined && submitted.expectedUserId !== user.id)
        || (submitted.memberId !== undefined && submitted.memberId !== user.id)) {
        return failure('Your account changed. Refresh before continuing.', 403);
      }
    }
    let workout;
    try { workout = parseManualWorkoutInput(body); }
    catch (error) { return failure(error instanceof Error ? error.message : 'Invalid workout.', 400); }

    const requestId = (body as Record<string, unknown>).requestId;
    if (requestId !== undefined && !uuid(requestId)) return failure('Invalid save reference.', 400);
    const { data, error } = await supabase.from('workouts').insert({
      ...(requestId && {log_request_id: requestId}),
      id: randomUUID(),
      member_id: user.id,
      workout_plan_id: null,
      name: workout.name,
      date: workout.date,
      exercises: workout.exercises,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).select(columns).single();
    if (error?.code === '23505' && requestId) {
      const prior = await supabase.from('workouts').select(columns).eq('member_id',user.id).eq('log_request_id',requestId).single();
      if (prior.data && !prior.error) {
        if (JSON.stringify(parseManualWorkoutInput(prior.data)) !== JSON.stringify(workout)) return failure('This workout was already saved. Open your workout history to review it.',409);
        return NextResponse.json({workout:loggedWorkoutView(prior.data)},{headers});
      }
    }
    if (error || !data) return failure('Your workout could not be saved. Please retry.', 503);
    return NextResponse.json({ workout: loggedWorkoutView(data) }, { status: 201, headers });
  } catch {
    return failure('Your workout could not be saved. Please retry.', 503);
  }
}
