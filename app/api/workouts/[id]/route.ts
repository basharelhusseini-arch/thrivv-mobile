import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { memberActor, memberBody, memberResult, MemberResourceError } from '@/lib/member-resource';
import { workoutView } from '@/lib/workout-records';
export const dynamic='force-dynamic';
type Ctx={params: Promise<{id:string}>};
export async function GET(req:NextRequest, props:Ctx) {
 const params = await props.params;
 return memberResult(async()=>{
  const user=await memberActor(req);const {data,error}=await supabase.from('workouts').select('*').eq('id',params.id).eq('member_id',user.id).maybeSingle();
  if(error)throw new MemberResourceError('Workout unavailable.',503);if(!data)throw new MemberResourceError('Workout not found.',404);return workoutView(data);
 });
}
export async function PUT(req:NextRequest, props:Ctx) {
 const params = await props.params;
 return memberResult(async()=>{
  const user=await memberActor(req);const b=await memberBody(req,user.id);const updates:Record<string,unknown>={};
  if(b.status!==undefined){if(!['scheduled','in_progress','completed','skipped'].includes(b.status))throw new MemberResourceError('Invalid status.',400);updates.status=b.status; if(b.status==='completed')updates.completed_at=new Date().toISOString();}
  if(b.notes!==undefined)updates.notes=String(b.notes).slice(0,5000);
  if(b.rating!==undefined){if(!Number.isInteger(b.rating)||b.rating<1||b.rating>5)throw new MemberResourceError('Rating must be 1–5.',400);updates.rating=b.rating;}
  const {data,error}=await supabase.from('workouts').update(updates).eq('id',params.id).eq('member_id',user.id).select().maybeSingle();
  if(error)throw new MemberResourceError('Unable to save workout.',503);if(!data)throw new MemberResourceError('Workout not found.',404);return workoutView(data);
 });
}
export async function DELETE(req:NextRequest, props:Ctx) {
 const params = await props.params;
 return memberResult(async()=>{
  const user=await memberActor(req);const {data,error}=await supabase.from('workouts').delete().eq('id',params.id).eq('member_id',user.id).select('id');
  if(error)throw new MemberResourceError('Unable to delete workout.',503);if(!data?.length)throw new MemberResourceError('Workout not found.',404);return {success:true};
 });
}
