import {timingSafeEqual} from 'crypto';
import {NextRequest,NextResponse} from 'next/server';
import {supabase} from '@/lib/supabase';
import {sendOperationsAlert} from '@/lib/operations-alerts';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const expected=`Bearer ${process.env.CRON_SECRET}`;const actual=req.headers.get('authorization')||'';
 if(!process.env.CRON_SECRET||Buffer.byteLength(expected)!==Buffer.byteLength(actual)||!timingSafeEqual(Buffer.from(expected),Buffer.from(actual)))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const {data,error}=await supabase.rpc('thrivv_operation_queue',{p_offset:0,p_limit:100});if(error)throw error;
  const notification=await sendOperationsAlert(data.total);
  // Keep telemetry bounded. Never retain request bodies, emails or health data.
  const cleanup=await supabase.from('runtime_errors').delete().lt('last_seen',new Date(Date.now()-30*86400000).toISOString());
  if(cleanup.error)throw cleanup.error;
  const deliveries=await supabase.from('operation_alert_deliveries').delete().lt('sent_at',new Date(Date.now()-7*86400000).toISOString());
  if(deliveries.error)throw deliveries.error;
  return NextResponse.json({issues:data.total,notification},{status:notification==='failed'?503:200});
 }catch{return NextResponse.json({error:'Operations monitoring unavailable'},{status:503});}
}
