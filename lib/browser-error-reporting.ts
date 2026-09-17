import {safeErrorRoute,safeErrorType} from './error-reporting-shared';
const sent=new Set<string>();
export function reportBrowserError(error:unknown){
 if(process.env.NODE_ENV!=='production')return;
 const route=safeErrorRoute(window.location.pathname),type=safeErrorType(error instanceof Error?error.name:'UnhandledRejection');
 const key=`${route}:${type}`;
 if(sent.has(key)||sent.size>=20)return;
 sent.add(key);
 void fetch('/api/telemetry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({route,type}),keepalive:true}).catch(()=>{});
}
