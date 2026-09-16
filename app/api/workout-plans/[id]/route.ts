export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;
    
    const { data: plan, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', id).eq('member_id', user.id)
      .single();
    
    if (error || !plan) {
      console.error('Workout plan not found:', error);
      return NextResponse.json(
        { error: 'Workout plan not found' },
        { status: 404 }
      );
    }
    
    // Convert snake_case to camelCase for frontend
    const formattedPlan = {
      id: plan.id,
      memberId: plan.member_id,
      name: plan.name,
      description: plan.description,
      goal: plan.goal,
      duration: plan.duration,
      frequency: plan.frequency,
      difficulty: plan.difficulty,
      status: plan.status,
      createdAt: plan.created_at,
      startDate: plan.start_date,
      endDate: plan.end_date,
      createdBy: plan.created_by,
    };
    
    return NextResponse.json(formattedPlan);
  } catch (error) {
    console.error('Error fetching workout plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;
    
    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', id).eq('member_id', user.id);
    
    if (error) {
      console.error('Failed to delete workout plan:', error);
      return NextResponse.json(
        { error: 'Workout plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Workout plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout plan' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;
    const body = await request.json();
    
    // Convert camelCase to snake_case for database
    const updates: any = {};
    if (body.status) updates.status = body.status;
    if (body.name) updates.name = body.name;
    if (body.description) updates.description = body.description;
    if (body.endDate) updates.end_date = body.endDate;
    
    const { data: updatedPlan, error } = await supabase
      .from('workout_plans')
      .update(updates)
      .eq('id', id).eq('member_id', user.id)
      .select()
      .single();
    
    if (error || !updatedPlan) {
      console.error('Failed to update workout plan:', error);
      return NextResponse.json(
        { error: 'Workout plan not found' },
        { status: 404 }
      );
    }
    
    // Convert snake_case to camelCase
    const formattedPlan = {
      id: updatedPlan.id,
      memberId: updatedPlan.member_id,
      name: updatedPlan.name,
      description: updatedPlan.description,
      goal: updatedPlan.goal,
      duration: updatedPlan.duration,
      frequency: updatedPlan.frequency,
      difficulty: updatedPlan.difficulty,
      status: updatedPlan.status,
      createdAt: updatedPlan.created_at,
      startDate: updatedPlan.start_date,
      endDate: updatedPlan.end_date,
      createdBy: updatedPlan.created_by,
    };
    
    return NextResponse.json(formattedPlan);
  } catch (error) {
    console.error('Error updating workout plan:', error);
    return NextResponse.json(
      { error: 'Failed to update workout plan' },
      { status: 500 }
    );
  }
}
