import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let user;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: 'Please sign in' }, { status: 401 }); }
  try {
    const { data: plan, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('id', params.id)
      .eq('member_id', user.id)
      .single();

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Nutrition plan not found or unavailable' },
        { status: error.code === 'PGRST116' ? 404 : 503 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        { error: 'Nutrition plan not found' },
        { status: 404 }
      );
    }

    // Convert snake_case to camelCase for UI
    const formattedPlan = {
      id: plan.id,
      memberId: plan.member_id,
      name: plan.name,
      description: plan.description,
      goal: plan.goal,
      duration: plan.duration,
      status: plan.status,
      macroTargets: plan.macro_targets,
      meals: plan.meals,
      mealPlans: plan.meal_plans, // Include 7-day meal plans
      dietaryRestrictions: plan.dietary_restrictions || [],
      preferences: plan.preferences || [],
      createdBy: plan.created_by,
      startDate: plan.start_date,
      endDate: plan.end_date,
      createdAt: plan.created_at,
    };

    return NextResponse.json(formattedPlan);
  } catch (error: any) {
    console.error('Failed to fetch nutrition plan:', error);
    return NextResponse.json(
      { error: 'Nutrition plan not found or unavailable' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let user;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: 'Please sign in' }, { status: 401 }); }
  try {
    const { error } = await supabase
      .from('nutrition_plans')
      .delete()
      .eq('id', params.id)
      .eq('member_id', user.id);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete nutrition plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete nutrition plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete nutrition plan' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let user;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: 'Please sign in' }, { status: 401 }); }
  try {
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    const body = await request.json();
    if (body.memberId !== undefined && body.memberId !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.macroTargets !== undefined) updates.macro_targets = body.macroTargets;
    if (body.meals !== undefined) updates.meals = body.meals;
    if (body.mealPlans !== undefined) updates.meal_plans = body.mealPlans;

    const { data: plan, error } = await supabase
      .from('nutrition_plans')
      .update(updates)
      .eq('id', params.id)
      .eq('member_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Failed to update nutrition plan' },
        { status: 500 }
      );
    }

    // Convert snake_case to camelCase for UI
    const formattedPlan = {
      id: plan.id,
      memberId: plan.member_id,
      name: plan.name,
      description: plan.description,
      goal: plan.goal,
      duration: plan.duration,
      status: plan.status,
      macroTargets: plan.macro_targets,
      meals: plan.meals,
      mealPlans: plan.meal_plans,
      dietaryRestrictions: plan.dietary_restrictions || [],
      preferences: plan.preferences || [],
      createdBy: plan.created_by,
      startDate: plan.start_date,
      endDate: plan.end_date,
      createdAt: plan.created_at,
    };

    return NextResponse.json(formattedPlan);
  } catch (error: any) {
    console.error('Failed to update nutrition plan:', error);
    return NextResponse.json(
      { error: 'Failed to update nutrition plan' },
      { status: 500 }
    );
  }
}
