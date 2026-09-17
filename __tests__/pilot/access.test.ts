jest.mock('@/lib/admin/http',()=>{const actual=jest.requireActual('@/lib/admin/http');return {...actual,actor:jest.fn()};});
jest.mock('@/lib/supabase',()=>({supabase:{rpc:jest.fn(),from:jest.fn()}}));
jest.mock('@/lib/gym-auth',()=>({checkGymAccess:jest.fn()}));
import {NextRequest} from 'next/server';
import {actor,HttpError} from '@/lib/admin/http';
import {checkGymAccess} from '@/lib/gym-auth';
import {supabase} from '@/lib/supabase';
import * as reminders from '@/app/api/member/notifications/route';
import * as operations from '@/app/api/admin/rewards/redemptions/route';
import * as analytics from '@/app/api/gym/[gym_id]/pilot/route';
const user='11111111-1111-4111-8111-111111111111';const requestId='22222222-2222-4222-8222-222222222222';
const request=(body?:object,query='')=>new NextRequest('https://thrivv.dev/api/test'+query,{method:body?'POST':'GET',headers:{origin:'https://thrivv.dev'},...(body?{body:JSON.stringify({requestId,...body})}:{})});
beforeEach(()=>{jest.clearAllMocks();(actor as jest.Mock).mockResolvedValue({id:user});(supabase.rpc as jest.Mock).mockResolvedValue({data:{reminders:[],scheduled:[]},error:null});});
test('member reminder reads cannot target another account',async()=>{expect((await reminders.GET(request(undefined,'?memberId=someone-else'))).status).toBe(403);expect(supabase.rpc).not.toHaveBeenCalled();});
test('reminder preferences reject cross-account, cross-origin and invalid targets',async()=>{
 expect((await reminders.POST(request({expectedUserId:'other'}))).status).toBe(403);
 expect((await reminders.POST(request({expectedUserId:user,available_rewards:true,voucher_expiry:true,weekly_target:8}))).status).toBe(400);
 const cross=new NextRequest('https://thrivv.dev/api/test',{method:'POST',headers:{origin:'https://other.test'},body:JSON.stringify({requestId})});expect((await reminders.POST(cross)).status).toBe(403);expect(supabase.from).not.toHaveBeenCalled();
});
test('only the authenticated owner supplies reminder identity',async()=>{expect((await reminders.GET(request())).status).toBe(200);expect(supabase.rpc).toHaveBeenCalledWith('thrivv_member_reminders',{p_user:user});});
test('redemption operations require admin before reaching inventory',async()=>{(actor as jest.Mock).mockRejectedValue(new HttpError(403,'Admin required'));expect((await operations.GET(request())).status).toBe(403);expect((await operations.POST(request({}))).status).toBe(403);expect(supabase.from).not.toHaveBeenCalled();expect(supabase.rpc).not.toHaveBeenCalled();});
test('redemption resolution requires merchant reference and forwards only authoritative actor',async()=>{
 const fields={redemptionId:requestId,action:'refund',reason:'Faulty code',reference:'MERCHANT-123',actor:'forged'};
 expect((await operations.POST(request({...fields,reference:''}))).status).toBe(400);
 expect((await operations.POST(request(fields))).status).toBe(200);
 expect(supabase.rpc).toHaveBeenCalledWith('thrivv_resolve_redemption',{p_actor:user,p_request:requestId,p_redemption:requestId,p_action:'refund',p_reason:'Faulty code',p_reference:'MERCHANT-123'});
});
test('gym reports and CSV enforce gym access before invoking analytics',async()=>{
 (checkGymAccess as jest.Mock).mockResolvedValue({ok:false,status:403,reason:'No access'});
 expect((await analytics.GET(request(undefined,'?format=csv'),{params:Promise.resolve({gym_id:requestId})})).status).toBe(403);expect(supabase.rpc).not.toHaveBeenCalled();
});
test('CSV reports contain definitions and consistent measured counts',async()=>{
 (checkGymAccess as jest.Mock).mockResolvedValue({ok:true});(supabase.rpc as jest.Mock).mockResolvedValue({data:{joined:3,firstVerified:2,confirmedUse:0,weekly:[{week:'2026-09-14',visit_days:2,participants:2}]},error:null});
 const res=await analytics.GET(request(undefined,'?format=csv'),{params:Promise.resolve({gym_id:requestId})});expect(res.status).toBe(200);expect(res.headers.get('Content-Type')).toContain('text/csv');expect(await res.text()).toContain('"confirmedUse","0"');
});
