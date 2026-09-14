import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { store } from '@/lib/store';
import { generateWeeklyMealPlans } from '@/lib/meal-plan-generator';
import { recipesData } from '@/lib/recipes';

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: 'Please sign in' }, { status: 401 }); }
  try {
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    const body = await request.json();
    if (body.memberId !== undefined && body.memberId !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const {
      goal,
      gender,
      age,
      height,
      weight,
      activityLevel,
      duration,
      dietaryRestrictions,
      preferences,
    } = body;

    const memberId = user.id;

    // Validate input before generating the plan
    if (!memberId || !goal || !gender || !age || !height || !weight || !activityLevel || !duration) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields',
          details: 'Goal, gender, age, height, weight, activity level and duration are required'
        },
        { status: 400 }
      );
    }

    if (![age, height, weight, duration].every(value => typeof value === 'number' && Number.isFinite(value))
      || !Number.isInteger(duration) || !['weight_loss', 'muscle_gain', 'maintenance', 'performance', 'general_health'].includes(goal)
      || !['male', 'female'].includes(gender) || !['sedentary', 'light', 'moderate', 'active', 'very_active'].includes(activityLevel)
      || [dietaryRestrictions, preferences].some(value => value !== undefined && (!Array.isArray(value) || value.length > 30 || value.some(item => typeof item !== 'string' || item.length > 100)))) {
      return NextResponse.json({ success: false, error: 'Invalid plan details' }, { status: 400 });
    }

    // Validate ranges
    if (age < 1 || age > 120) {
      return NextResponse.json(
        { success: false, error: 'Invalid age', details: 'Age must be between 1 and 120' },
        { status: 400 }
      );
    }

    if (height < 50 || height > 300) {
      return NextResponse.json(
        { success: false, error: 'Invalid height', details: 'Height must be between 50cm and 300cm' },
        { status: 400 }
      );
    }

    if (weight < 20 || weight > 500) {
      return NextResponse.json(
        { success: false, error: 'Invalid weight', details: 'Weight must be between 20kg and 500kg' },
        { status: 400 }
      );
    }

    if (duration < 1 || duration > 90) {
      return NextResponse.json(
        { success: false, error: 'Invalid duration', details: 'Duration must be between 1 and 90 days' },
        { status: 400 }
      );
    }

    // Generate plan using in-memory logic (keeps existing generation algorithm)
    const generatedPlan = store.generateNutritionPlan({
      memberId,
      goal,
      gender,
      age,
      height,
      weight,
      activityLevel,
      duration,
      dietaryRestrictions,
      preferences,
    });

    // Generate 7-day meal plans from recipes (NEVER FAILS)
    const { mealPlans, warnings } = generateWeeklyMealPlans({
      targetCalories: generatedPlan.macroTargets.calories,
      targetProtein: generatedPlan.macroTargets.protein,
      targetCarbs: generatedPlan.macroTargets.carbohydrates,
      targetFat: generatedPlan.macroTargets.fats,
      goal: generatedPlan.goal,
      dietaryRestrictions: dietaryRestrictions,
      preferences: preferences,
      recipes: recipesData,
    });

    // Log warnings in development
    if (warnings.length > 0) {
      console.warn('⚠️  Meal plan generation warnings:', warnings);
    }

    // Save to Supabase for persistence
    const { data: plan, error } = await supabase
      .from('nutrition_plans')
      .insert({
        id: generatedPlan.id,
        member_id: memberId,
        name: generatedPlan.name,
        description: generatedPlan.description,
        goal: generatedPlan.goal,
        duration: generatedPlan.duration,
        status: generatedPlan.status,
        macro_targets: generatedPlan.macroTargets,
        meals: generatedPlan.meals,
        meal_plans: mealPlans, // Add 7-day meal plans
        dietary_restrictions: dietaryRestrictions || [],
        preferences: preferences || [],
        created_by: 'ai',
        start_date: generatedPlan.startDate,
        end_date: generatedPlan.endDate,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ success: false, error: 'Your plan could not be saved. Please retry.' }, { status: 503 });
    }

    // Return the plan in the same format the UI expects
    // ALWAYS return success: true with optional warnings
    return NextResponse.json({
      success: true,
      plan: {
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
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Unexpected error during nutrition plan generation:', error);
    
    // Even in catastrophic failure, try to return useful info
    // Only return success=false for truly unrecoverable errors
    return NextResponse.json(
      { 
        success: false,
        error: 'Unexpected server error',
        details: process.env.NODE_ENV === 'development' ? error.message || error.toString() : 'Please try again or contact support'
      },
      { status: 500 }
    );
  }
}
