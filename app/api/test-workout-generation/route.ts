import { checkAdminAccess } from '@/lib/gym-auth';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAthleteWorkoutPlan } from '@/lib/athlete-workout-generator';
import { exercisesDatabase } from '@/lib/exercises';

export async function GET(request: NextRequest) {
  const access=await checkAdminAccess();
  if(!access.ok) return NextResponse.json({error:access.reason},{status:access.status});
  const logs: string[] = [];
  const errors: string[] = [];
  
  try {
    logs.push('🧪 Starting workout generation diagnostics...');
    
    // Test 1: Environment variables
    logs.push('\n1️⃣ Checking environment variables:');
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    logs.push(`   NEXT_PUBLIC_SUPABASE_URL: ${hasSupabaseUrl ? '✅ Set' : '❌ Missing'}`);
    logs.push(`   SUPABASE_SERVICE_ROLE_KEY: ${hasServiceKey ? '✅ Set' : '❌ Missing'}`);
    
    if (!hasSupabaseUrl || !hasServiceKey) {
      errors.push('Missing Supabase environment variables in Vercel!');
    }
    
    // Test 2: Exercise database
    logs.push('\n2️⃣ Checking exercise database:');
    logs.push(`   Exercises loaded: ${exercisesDatabase?.length || 0}`);
    if (!exercisesDatabase || exercisesDatabase.length === 0) {
      errors.push('Exercise database is empty!');
    } else {
      logs.push(`   ✅ Exercise database OK (${exercisesDatabase.length} exercises)`);
    }
    
    // Test 3: Supabase connection
    logs.push('\n3️⃣ Testing Supabase connection:');
    if (hasSupabaseUrl && hasServiceKey) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Check if tables exist
      const { data: plansData, error: plansError } = await supabase
        .from('workout_plans')
        .select('count')
        .limit(0);
      
      if (plansError) {
        errors.push(`workout_plans table error: ${plansError.message}`);
        logs.push(`   ❌ workout_plans table: ${plansError.message}`);
      } else {
        logs.push('   ✅ workout_plans table exists');
      }
      
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('count')
        .limit(0);
      
      if (workoutsError) {
        errors.push(`workouts table error: ${workoutsError.message}`);
        logs.push(`   ❌ workouts table: ${workoutsError.message}`);
      } else {
        logs.push('   ✅ workouts table exists');
      }
    }
    
    // Test 4: Workout generation
    logs.push('\n4️⃣ Testing workout generation:');
    if (exercisesDatabase && exercisesDatabase.length > 0) {
      const testParams = {
        memberId: 'test-diagnostic-user',
        goal: 'strength' as const,
        difficulty: 'intermediate' as const,
        duration: 2,
        frequency: 3,
        equipment: ['barbell', 'dumbbells'],
        limitations: [],
      };
      
      logs.push(`   Generating test plan (${testParams.duration} weeks × ${testParams.frequency} days)...`);
      
      const result = generateAthleteWorkoutPlan(testParams, exercisesDatabase);
      
      if (!result) {
        errors.push('generateAthleteWorkoutPlan returned null/undefined');
        logs.push('   ❌ Generator returned nothing');
      } else {
        const { plan, workouts } = result;
        logs.push(`   Plan generated: ${plan?.id || 'NO ID'}`);
        logs.push(`   Workouts generated: ${workouts?.length || 0}`);
        logs.push(`   Expected workouts: ${testParams.duration * testParams.frequency}`);
        
        if (!workouts || workouts.length === 0) {
          errors.push(`Generator created plan but 0 workouts! Expected ${testParams.duration * testParams.frequency}`);
        } else {
          logs.push(`   ✅ Generation successful`);
          logs.push(`   Sample workout: ${workouts[0]?.name}`);
          logs.push(`   Exercises in workout 1: ${workouts[0]?.exercises?.length || 0}`);
        }
      }
    }
    
    // Summary
    logs.push('\n' + '='.repeat(60));
    logs.push('📊 DIAGNOSTIC SUMMARY');
    logs.push('='.repeat(60));
    
    if (errors.length === 0) {
      logs.push('✅ All checks passed!');
      logs.push('The system should be working. If not, check Vercel Function logs.');
    } else {
      logs.push('❌ PROBLEMS FOUND:');
      errors.forEach((err, i) => {
        logs.push(`   ${i + 1}. ${err}`);
      });
    }
    
    return NextResponse.json({
      success: errors.length === 0,
      errors,
      logs: logs.join('\n'),
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logs.push(`\n❌ Fatal error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return NextResponse.json({
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      logs: logs.join('\n'),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
