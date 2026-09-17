import { NextRequest } from 'next/server';
import { actor, bodyOf, handled, HttpError, json } from '@/lib/admin/http';
import { supabase } from '@/lib/supabase';
export function GET(req: NextRequest) { return handled(async()=>{
  const user=await actor(false); const expected=req.nextUrl.searchParams.get('memberId');
  if(expected && expected!==user.id) throw new HttpError(403,'Your account changed. Refresh to continue.');
  const {data,error}=await supabase.rpc('thrivv_member_reminders',{p_user:user.id});if(error)throw error;return json(data);
}); }
export function POST(req:NextRequest) { return handled(async()=>{
  const user=await actor(false);const b=await bodyOf(req);
  if(b.expectedUserId!==user.id) throw new HttpError(403,'Your account changed. Refresh to continue.');
  if(typeof b.available_rewards!=='boolean' || typeof b.voucher_expiry!=='boolean' || !Number.isInteger(b.weekly_target) || b.weekly_target<0 || b.weekly_target>7) throw new HttpError(400,'Invalid reminder preferences');
  const {error}=await supabase.from('member_reminder_preferences').upsert({user_id:user.id,available_rewards:b.available_rewards,voucher_expiry:b.voucher_expiry,weekly_target:b.weekly_target,updated_at:new Date().toISOString()});
  if(error)throw error;return json({saved:true});
}); }
