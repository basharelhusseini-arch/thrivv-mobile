import { NextRequest, NextResponse } from 'next/server';
import { checkGymAccess } from '@/lib/gym-auth';
import { supabase } from '@/lib/supabase';
import { isWorkoutLogDate } from '@/lib/manual-workouts';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest, props: {params: Promise<{gym_id:string}>}) {
  const {gym_id}=await props.params; const access=await checkGymAccess(gym_id);
  const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
  if(!access.ok) return NextResponse.json({error:access.reason},{status:access.status,headers});
  const from=req.nextUrl.searchParams.get('from');
  if(from && !isWorkoutLogDate(from)) return NextResponse.json({error:'Choose a valid start date'},{status:400,headers});
  const {data,error}=await supabase.rpc('thrivv_gym_pilot_analytics',{p_gym:gym_id,p_start:from || null});
  if(error) return NextResponse.json({error:'Report unavailable. Choose a start date within the last year and retry.'},{status:503,headers});
  if(req.nextUrl.searchParams.get('format')==='csv') {
    const rows=Object.entries(data).filter(([key])=>key!=='weekly').map(([key,value])=>[key,String(value??'Not available')]);
    rows.push(['definition','Verified QR member-days; current members only; not proof of gym membership retention.'],['cohort','Joined, first visit, repeat visit and first reward count members who joined during the report period.'],['attribution','Redemptions are attributed to the branch at issue time. Earlier unattributed receipts are excluded.'],['weekly_start','verified_visit_days','participants']);
    for(const week of data.weekly) rows.push([week.week,String(week.visit_days),String(week.participants)]);
    const csv=rows.map(row=>row.map(cell=>`"${cell.replaceAll('"','""')}"`).join(',')).join('\r\n');
    return new NextResponse('\uFEFF'+csv,{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="thrivv-pilot-report.csv"'}});
  }
  return NextResponse.json(data,{headers});
}
