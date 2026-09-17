import {NextRequest} from 'next/server';
import {actor,handled,json,pageOffset} from '@/lib/admin/http';
import {supabase} from '@/lib/supabase';
export const dynamic='force-dynamic';
export function GET(req:NextRequest){return handled(async()=>{
 await actor();const {data,error}=await supabase.rpc('thrivv_operation_queue',{p_offset:pageOffset(req),p_limit:50});
 if(error)throw error;
 return json({...data,alertsConfigured:Boolean(process.env.OPERATIONS_EMAIL_TO&&process.env.OPERATIONS_EMAIL_FROM&&process.env.RESEND_API_KEY)});
});}
