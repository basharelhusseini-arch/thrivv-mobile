import {NextRequest} from 'next/server';
const auth=jest.fn();const from=jest.fn();
jest.mock('@/lib/auth',()=>({getCurrentUser:()=>auth()}));
jest.mock('@/lib/supabase',()=>({supabase:{from:(...args:unknown[])=>from(...args)}}));
import {PUT} from '@/app/api/workouts/log/[id]/route';
import {GET} from '@/app/api/workouts/progress/route';
const input={name:'Legs',date:'2026-09-17',exercises:[{name:'Squat',sets:1,reps:5,setDetails:[{reps:5,weightKg:80}]}]};
const row={id:'saved',member_id:'owner',...input,completed_at:'2026-09-17T12:00:00Z'};
function query(data:unknown,error:unknown=null){const q:any={};for(const m of ['select','update','eq','is','order','range','neq','lte'])q[m]=jest.fn(()=>q);q.maybeSingle=async()=>({data,error});q.then=(r:any)=>Promise.resolve({data,error}).then(r);return q;}
const req=(body:unknown,origin='https://thrivv.dev')=>new NextRequest('https://thrivv.dev/api/workouts/log/saved',{method:'PUT',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)});
const context={params:Promise.resolve({id:'saved'})};
beforeEach(()=>{jest.clearAllMocks();auth.mockResolvedValue({id:'owner'});});
test('edits are owner-scoped and cannot modify points or ownership',async()=>{const q=query(row);from.mockReturnValue(q);const res=await PUT(req({...input,expectedUserId:'owner',reward_points:999}),context);expect(res.status).toBe(200);expect(q.update).toHaveBeenCalledWith(input);expect(q.eq).toHaveBeenCalledWith('member_id','owner');expect(q.eq).toHaveBeenCalledWith('id','saved');expect(q.is).toHaveBeenCalledWith('workout_plan_id',null);});
test('rejects foreign-session, cross-origin and invalid edits without mutation',async()=>{
 expect((await PUT(req({...input,expectedUserId:'other'}),context)).status).toBe(403);
 expect((await PUT(req({...input,expectedUserId:'owner'},'https://evil.test'),context)).status).toBe(403);
 expect((await PUT(req({...input,expectedUserId:'owner',exercises:[]}),context)).status).toBe(400);expect(from).not.toHaveBeenCalled();
});
test('does not claim success for a deleted or foreign workout',async()=>{from.mockReturnValue(query(null));expect((await PUT(req({...input,expectedUserId:'owner'}),context)).status).toBe(404);});
test('personal bests include records beyond the first database page',async()=>{
 const first=query(Array.from({length:500},(_,i)=>({...row,id:String(i)})));const second=query([{...row,id:'old',date:'2020-01-01',exercises:[{...input.exercises[0],setDetails:[{reps:5,weightKg:120}]}]}]);from.mockReturnValueOnce(first).mockReturnValueOnce(second);
 const res=await GET(new NextRequest('https://thrivv.dev/api/workouts/progress?expectedUserId=owner'));expect(res.status).toBe(200);
 expect((await res.json()).progress[0]).toMatchObject({name:'Squat',bestKg:120,latestKg:80});expect(second.range).toHaveBeenCalledWith(500,999);expect(first.eq).toHaveBeenCalledWith('member_id','owner');
});
test('progress endpoint rejects account-switch requests',async()=>{expect((await GET(new NextRequest('https://thrivv.dev/api/workouts/progress?expectedUserId=other'))).status).toBe(403);expect(from).not.toHaveBeenCalled();});
