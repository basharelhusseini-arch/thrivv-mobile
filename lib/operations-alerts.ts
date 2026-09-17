import {createHash,randomUUID} from 'crypto';
import {supabase} from '@/lib/supabase';
export async function sendOperationsAlert(total:number){
 const to=process.env.OPERATIONS_EMAIL_TO,from=process.env.OPERATIONS_EMAIL_FROM,key=process.env.RESEND_API_KEY;
 if(!to||!from||!key)return 'not_configured';
 if(!total)return 'clear';
 // Stable six-hour delivery bucket: retries reuse the provider's idempotency key.
 const bucket=Math.floor(Date.now()/(6*3600000));
 const fingerprint=createHash('sha256').update(`operations:${bucket}`).digest('hex');
 const lease=randomUUID();
 const claim=await supabase.rpc('thrivv_claim_operation_alert',{p_key:fingerprint,p_lease:lease});
 if(claim.error)throw claim.error;if(!claim.data)return 'already_claimed';
 let sent=false;
 try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`thrivv-operations/${fingerprint}`},body:JSON.stringify({from,to:[to],subject:'Thrivv: operations need attention',text:`Thrivv has issues requiring review, including reward stock, sync failures, support or production errors.\n\nOpen the prioritised queue: https://gyms.thrivv.dev/admin/gyms?tab=Overview\n\nSign in as a platform administrator to see current details.`})});
   sent=response.ok;
 }finally{
   const result=await supabase.rpc('thrivv_finish_operation_alert',{p_key:fingerprint,p_lease:lease,p_sent:sent});
   if(result.error)throw result.error;
 }
 return sent?'accepted':'failed';
}
