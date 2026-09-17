import {enqueueWorkout,flushWorkoutQueue,queuedWorkouts} from '@/lib/workout-upload-queue';
const payload={requestId:'00000000-0000-4000-8000-000000000001',expectedUserId:'owner',name:'Legs',date:'2026-09-17',exercises:[{name:'Squat',sets:1,reps:5,setDetails:[{reps:5,weightKg:80}]}]};
let storage:Map<string,string>;
const originalFetch=global.fetch;
beforeEach(()=>{storage=new Map();Object.defineProperty(global,'localStorage',{configurable:true,value:{get length(){return storage.size;},key:(i:number)=>[...storage.keys()][i],getItem:(key:string)=>storage.get(key)||null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)}});Object.defineProperty(global,'window',{configurable:true,value:new EventTarget()});Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:true}});global.fetch=jest.fn();});
afterEach(()=>{global.fetch=originalFetch;delete (global as any).window;delete (global as any).localStorage;});
const flush=()=>flushWorkoutQueue('owner',new AbortController().signal);
test('offline enqueue survives reload and only sends the owner queue',async()=>{
 enqueueWorkout(payload);enqueueWorkout({...payload,expectedUserId:'other'});(navigator as any).onLine=false;
 expect(await flush()).toBe(0);expect(global.fetch).not.toHaveBeenCalled();expect(queuedWorkouts('owner')).toHaveLength(1);
 (navigator as any).onLine=true;(global.fetch as jest.Mock).mockResolvedValue({ok:true,status:201,json:async()=>({workout:{id:'saved'}})});
 expect(await flush()).toBe(1);expect(queuedWorkouts('owner')).toHaveLength(0);expect(queuedWorkouts('other')).toHaveLength(1);
 expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual(payload);
});
test('an ambiguous timeout retries exactly the same request reference',async()=>{
 enqueueWorkout(payload);(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Timeout')).mockResolvedValueOnce({ok:true,status:200,json:async()=>({workout:{id:'original'}})});
 expect(await flush()).toBe(0);expect(queuedWorkouts('owner')).toHaveLength(1);expect(await flush()).toBe(1);
 expect((global.fetch as jest.Mock).mock.calls[0][1].body).toBe((global.fetch as jest.Mock).mock.calls[1][1].body);
});
test.each([401,403,429,503])('retains queued payload after status %s',async status=>{
 enqueueWorkout(payload);(global.fetch as jest.Mock).mockResolvedValue({ok:false,status});await flush();expect(queuedWorkouts('owner')).toHaveLength(1);
});
test('validation failures require review and do not loop automatically',async()=>{
 enqueueWorkout(payload);(global.fetch as jest.Mock).mockResolvedValue({ok:false,status:400,json:async()=>({error:'Invalid exercise'})});await flush();await flush();
 expect(global.fetch).toHaveBeenCalledTimes(1);expect(queuedWorkouts('owner')[0].error).toBe('Invalid exercise');
});
test('same key cannot replace the payload of an uncertain save',()=>{
 enqueueWorkout(payload);expect(()=>enqueueWorkout({...payload,name:'Different'})).toThrow('already queued');expect(queuedWorkouts('owner')[0].payload.name).toBe('Legs');
});
test('aborted account session cannot upload',async()=>{enqueueWorkout(payload);const controller=new AbortController();controller.abort();await flushWorkoutQueue('owner',controller.signal);expect(global.fetch).not.toHaveBeenCalled();});
