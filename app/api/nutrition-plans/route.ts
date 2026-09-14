import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: 'Please sign in' }, { status: 401 }); }
  try {
    const requestedMember = request.nextUrl.searchParams.get('memberId');
    if (requestedMember && requestedMember !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const query = supabase.from('nutrition_plans').select('*').eq('member_id', user.id);

    const { data: plans, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch nutrition plans' },
        { status: 500 }
      );
    }

    // Convert snake_case to camelCase for UI
    const formattedPlans = (plans || []).map((plan: any) => ({
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
    }));

    return NextResponse.json(formattedPlans);
  } catch (error: any) {
    console.error('Failed to fetch nutrition plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nutrition plans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: 'Please sign in' }, { status: 401 }); }
  try {
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    const body = await request.json();
    if (body.memberId !== undefined && body.memberId !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    
    const { data: plan, error } = await supabase
      .from('nutrition_plans')
      .insert({
        id: crypto.randomUUID(),
        member_id: user.id,
        name: body.name,
        description: body.description,
        goal: body.goal,
        duration: body.duration,
        status: body.status || 'active',
        macro_targets: body.macroTargets,
        meals: body.meals,
        meal_plans: body.mealPlans, // Include 7-day meal plans
        dietary_restrictions: body.dietaryRestrictions || [],
        preferences: body.preferences || [],
        created_by: body.createdBy || 'manual',
        start_date: body.startDate,
        end_date: body.endDate,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create nutrition plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
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
      dietaryRestrictions: plan.dietary_restrictions,
      preferences: plan.preferences,
      createdBy: plan.created_by,
      startDate: plan.start_date,
      endDate: plan.end_date,
      createdAt: plan.created_at,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create nutrition plan:', error);
    return NextResponse.json(
      { error: 'Failed to create nutrition plan' },
      { status: 400 }
    );
  }
}
