import {createHash} from 'crypto';
import {safeErrorRoute,safeErrorType} from './error-reporting-shared';
export async function recordProductionError(source:'server'|'browser',path:string,error:unknown){
 if(process.env.NODE_ENV!=='production'&&process.env.ERROR_REPORTING_ENABLED!=='true')return;
 const route=safeErrorRoute(path);const type=safeErrorType(error instanceof Error?error.name:error);
 const fingerprint=createHash('sha256').update(`${source}:${route}:${type}`).digest('hex');
 try{
  const {supabase}=await import('./supabase');
  const result=await supabase.rpc('thrivv_record_runtime_error',{p_fingerprint:fingerprint,p_source:source,p_route:route,p_type:type});
  if(result.error)console.error('Thrivv error reporting unavailable',fingerprint);
  else console.error('Thrivv captured error',fingerprint,route,type);
 }catch{console.error('Thrivv error reporting unavailable',fingerprint);}
}
