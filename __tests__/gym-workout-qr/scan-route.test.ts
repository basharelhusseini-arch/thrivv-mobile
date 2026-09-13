jest.mock('@/lib/auth',()=>({getCurrentUser:jest.fn()}));
jest.mock('@/lib/supabase',()=>({supabase:{from:jest.fn(),rpc:jest.fn()}}));
jest.mock('@/lib/daily-health-score',()=>({scoreContext:jest.fn()}));
jest.mock('@/lib/gym-reward-status',()=>({gymRewardStatus:jest.fn()}));
jest.mock('@/lib/rewards/ledger',()=>({reconcileDailyReward:jest.fn()}));
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { scoreContext } from '@/lib/daily-health-score';
import { reconcileDailyReward } from '@/lib/rewards/ledger';
import { createGymWorkoutQr } from '@/lib/gym-workout-qr';
import { POST } from '@/app/api/member/workout-verification/route';
import { NextRequest } from 'next/server';
const user='00000000-0000-4000-8000-000000000001',gym='00000000-0000-4000-8000-000000000002',operator='00000000-0000-4000-8000-000000000003',workout='00000000-0000-4000-8000-000000000004';
const saved={...process.env};
beforeEach(()=>{jest.clearAllMocks();process.env.GYM_WORKOUT_QR_SECRET=Buffer.alloc(32,9).toString('base64');
 (getCurrentUser as jest.Mock).mockResolvedValue({id:user});
 (supabase.from as jest.Mock).mockReturnValue({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:user},error:null})})})});
 (scoreContext as jest.Mock).mockResolvedValue({gymId:gym});(supabase.rpc as jest.Mock).mockResolvedValue({data:{date:'2026-09-13'},error:null});(reconcileDailyReward as jest.Mock).mockResolvedValue({status:'credited',awarded:43.5});
});
afterAll(()=>{process.env=saved;});
async function request(extra={},origin='https://thrivv.dev',codeGym=gym){const {token}=await createGymWorkoutQr(codeGym,operator);return new NextRequest('https://thrivv.dev/api/member/workout-verification',{method:'POST',headers:{origin,'Content-Type':'application/json','x-user-id':operator},body:JSON.stringify({workoutId:workout,requestId:workout,qr:'thrivv-workout:'+token,...extra})});}
test('uses session identity, not supplied header; credits only after database acceptance',async()=>{const res=await POST(await request());expect(res.status).toBe(200);expect(supabase.rpc).toHaveBeenCalledWith('thrivv_verify_gym_workout',expect.objectContaining({p_user:user,p_gym:gym,p_workout:workout,p_operator:operator}));expect(reconcileDailyReward).toHaveBeenCalledWith(user,'2026-09-13');expect(res.headers.get('cache-control')).toContain('no-store');});
test('no session rejects forged user header',async()=>{(getCurrentUser as jest.Mock).mockResolvedValue(null);expect((await POST(await request())).status).toBe(401);expect(supabase.rpc).not.toHaveBeenCalled();});
test.each([{amount:999},{score:110},{userId:operator},{gymId:operator}])('rejects client trusted fields %j',async fields=>{expect((await POST(await request(fields))).status).toBe(400);expect(supabase.rpc).not.toHaveBeenCalled();});
test('rejects cross-site requests and wrong gym signatures',async()=>{expect((await POST(await request({},'https://evil.invalid'))).status).toBe(403);expect((await POST(await request({},'https://thrivv.dev',operator))).status).toBe(400);});
test('database rejection never credits; accounting outage preserves accepted verification',async()=>{(supabase.rpc as jest.Mock).mockResolvedValueOnce({error:{}});expect((await POST(await request())).status).toBe(409);expect(reconcileDailyReward).not.toHaveBeenCalled();(reconcileDailyReward as jest.Mock).mockRejectedValue(new Error('outage'));const res=await POST(await request());expect(res.status).toBe(200);expect(await res.json()).toMatchObject({verified:true,reward:{status:'retry_pending'}});});

test('manual scans use authenticated identity and return the atomic database award',async()=>{
 (supabase.rpc as jest.Mock).mockResolvedValue({data:{verified:true,date:'2026-09-13',reward:{status:'credited',awarded:40}},error:null});
 const res=await POST(await request({workoutId:'manual'}));expect(res.status).toBe(200);
 expect(supabase.rpc).toHaveBeenCalledWith('thrivv_verify_manual_workout',expect.objectContaining({p_user:user,p_gym:gym,p_operator:operator}));
 expect(reconcileDailyReward).not.toHaveBeenCalled();expect(await res.json()).toMatchObject({reward:{awarded:40}});
});
test('manual database denial never falls back to a WHOOP reward',async()=>{
 (supabase.rpc as jest.Mock).mockResolvedValue({error:{}});expect((await POST(await request({workoutId:'manual'}))).status).toBe(409);
 expect(reconcileDailyReward).not.toHaveBeenCalled();
});
