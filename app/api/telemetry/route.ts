import {NextRequest,NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {recordProductionError} from '@/lib/error-reporting';
const recent=new Map<string,number>();
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return new NextResponse(null,{status:403});
 const user=await getCurrentUser();if(!user)return new NextResponse(null,{status:401});
 const now=Date.now();
 for(const [key,time] of recent)if(time<now-60000)recent.delete(key);
 if(recent.has(user.id)||recent.size>5000)return new NextResponse(null,{status:429});
 recent.set(user.id,now);
 const raw=await req.text();if(raw.length>1000)return new NextResponse(null,{status:413});
 try{const b=JSON.parse(raw);if(typeof b.route!=='string'||typeof b.type!=='string')return new NextResponse(null,{status:400});await recordProductionError('browser',b.route,b.type);return new NextResponse(null,{status:204});}
 catch{return new NextResponse(null,{status:400});}
}
