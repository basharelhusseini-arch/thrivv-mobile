import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { memberActor, memberBody, memberResult, MemberResourceError } from '@/lib/member-resource';
import { workoutPlanView } from '@/lib/workout-records';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest) { return memberResult(async()=>{
 const user=await memberActor(req); const {data,error}=await supabase.from('workout_plans').select('*').eq('member_id',user.id).order('created_at',{ascending:false});
 if(error) throw new MemberResourceError('Workout plans unavailable.',503);
 return (data||[]).map(workoutPlanView);
}); }
export async function POST(req:NextRequest) { return memberResult(async()=>{
 const user=await memberActor(req); const b=await memberBody(req,user.id);
 if(typeof b.name!=='string'||!b.name.trim()) throw new MemberResourceError('Plan name required.',400);
 const {data,error}=await supabase.from('workout_plans').insert({id:crypto.randomUUID(),member_id:user.id,name:b.name.slice(0,120),description:String(b.description||'').slice(0,2000),goal:b.goal,duration:b.duration,frequency:b.frequency,difficulty:b.difficulty,status:'active',created_by:'member',start_date:new Date().toISOString().slice(0,10)}).select().single();
 if(error) throw new MemberResourceError('Unable to save plan.',503); return workoutPlanView(data);
},201); }
