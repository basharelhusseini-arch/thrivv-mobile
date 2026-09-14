import { NextRequest } from 'next/server';
const getCurrentUser = jest.fn();
const from = jest.fn();
jest.mock('@/lib/auth', () => ({getCurrentUser: (...a:unknown[])=>getCurrentUser(...a)}));
jest.mock('@/lib/supabase',()=>({supabase:{from:(...a:unknown[])=>from(...a)}}));
jest.mock('@supabase/supabase-js',()=>({createClient:()=>({from:(...a:unknown[])=>from(...a)})}));
import * as plans from '@/app/api/workout-plans/route';
import * as detail from '@/app/api/workout-plans/[id]/route';
import * as workouts from '@/app/api/workouts/route';
import * as profile from '@/app/api/health/profile/route';
import * as verification from '@/app/api/verification/event/route';
function req(path:string,method='GET',body?:unknown){return new NextRequest(`https://www.thrivv.dev${path}`,{method,headers:{'Content-Type':'application/json','x-user-id':'victim'},...(body?{body:JSON.stringify(body)}:{})});}
function query(data:unknown){const q:any={};for(const key of ['select','eq','order','delete','insert','update'])q[key]=jest.fn(()=>q);q.single=jest.fn(async()=>({data,error:null}));q.maybeSingle=q.single;q.then=(resolve:any)=>Promise.resolve({data,error:null}).then(resolve);return q;}
beforeEach(()=>{jest.clearAllMocks();getCurrentUser.mockResolvedValue({id:'owner'});});
test('anonymous requests cannot list or change plans, workouts or health profiles',async()=>{
 getCurrentUser.mockResolvedValue(null);
 expect((await plans.GET(req('/api/workout-plans'))).status).toBe(401);
 expect((await workouts.GET(req('/api/workouts'))).status).toBe(401);
 expect((await detail.DELETE(req('/api/workout-plans/other','DELETE'),{params:{id:'other'}})).status).toBe(401);
 expect((await profile.GET(req('/api/health/profile'))).status).toBe(401);
 expect(from).not.toHaveBeenCalled();
});
test('a supplied different member cannot broaden plan or workout lists',async()=>{
 expect((await plans.GET(req('/api/workout-plans?memberId=victim'))).status).toBe(403);
 expect((await workouts.GET(req('/api/workouts?memberId=victim'))).status).toBe(403);
 expect(from).not.toHaveBeenCalled();
});
test('plan collection uses persisted records scoped to signed in owner',async()=>{
 const q=query([{id:'p',member_id:'owner',name:'Persisted plan'}]);from.mockReturnValue(q);
 const res=await plans.GET(req('/api/workout-plans'));
 expect(res.status).toBe(200);expect(q.eq).toHaveBeenCalledWith('member_id','owner');
 expect((await res.json())[0].memberId).toBe('owner');expect(res.headers.get('Cache-Control')).toContain('no-store');
});
test('plan ID lookup and deletion always constrain owner',async()=>{
 const q=query(null);from.mockReturnValue(q);
 expect((await detail.GET(req('/api/workout-plans/other'),{params:{id:'other'}})).status).toBe(404);
 expect(q.eq).toHaveBeenCalledWith('member_id','owner');
 await detail.DELETE(req('/api/workout-plans/other','DELETE'),{params:{id:'other'}});
 expect(q.eq.mock.calls.filter((a:any[])=>a[0]==='member_id')).toHaveLength(2);
});
test('workoutPlanId filtering cannot expose another owner workouts',async()=>{
 const q=query([]);from.mockReturnValue(q);await workouts.GET(req('/api/workouts?workoutPlanId=other'));
 expect(q.eq).toHaveBeenCalledWith('member_id','owner');expect(q.eq).toHaveBeenCalledWith('workout_plan_id','other');
});
test('health profile ignores spoofed identity header',async()=>{
 const q=query(null);from.mockReturnValue(q);expect((await profile.GET(req('/api/health/profile'))).status).toBe(200);
 expect(q.eq).toHaveBeenCalledWith('user_id','owner');expect(q.eq).not.toHaveBeenCalledWith('user_id','victim');
});
test('members cannot mint verification events via legacy endpoint',async()=>{
 const res=await verification.POST(req('/api/verification/event','POST',{status:'verified',method:'gym_qr'}));
 expect(res.status).toBe(403);expect(from).not.toHaveBeenCalled();
});
