import {parseManualWorkoutInput,loggedWorkoutView,workoutProgress} from '@/lib/manual-workouts';
const payload={name:'Strength',date:'2026-09-17',exercises:[{name:'Custom row',sets:2,reps:8,setDetails:[{reps:8,weightKg:20},{reps:6,weightKg:22.5}]}]};
test('per-set reps and weights survive validation and the history view without trusting extra fields',()=>{
 const parsed=parseManualWorkoutInput({...payload,userId:'other',exercises:payload.exercises.map(e=>({...e,points:900,setDetails:e.setDetails.map(s=>({...s,owner:'other'}))}))});
 expect(parsed).toEqual(payload);
 expect(loggedWorkoutView({id:'x',member_id:'m',completed_at:'2026-09-17T10:00:00Z',...parsed}).exercises).toEqual(payload.exercises);
});
test.each([-1,1501,Infinity,NaN,'20'])('rejects invalid weight %p',weightKg=>expect(()=>parseManualWorkoutInput({...payload,exercises:[{...payload.exercises[0],setDetails:[{reps:8,weightKg},{reps:8,weightKg:0}]}]})).toThrow('Weight'));
test('rejects missing sets and invalid variable reps',()=>{
 expect(()=>parseManualWorkoutInput({...payload,exercises:[{...payload.exercises[0],sets:3}]})).toThrow('every set');
 expect(()=>parseManualWorkoutInput({...payload,exercises:[{...payload.exercises[0],setDetails:[{reps:0,weightKg:20},{reps:8,weightKg:null}]}]})).toThrow('Set reps');
});
test('progress distinguishes unknown weight from a recorded zero and reports latest versus best',()=>{
 const make=(date:string,weightKg:number|null)=>loggedWorkoutView({id:date,member_id:'m',name:'Strength',date,completed_at:date+'T10:00:00Z',exercises:[{name:'Row',sets:1,reps:8,setDetails:[{reps:8,weightKg}]}]});
 expect(workoutProgress([make('2026-09-15',30),make('2026-09-17',20),make('2026-09-16',null)])).toEqual([{name:'Row',latestKg:20,bestKg:30,date:'2026-09-17'}]);
 expect(workoutProgress([make('2026-09-17',null)])).toEqual([]);
 expect(workoutProgress([make('2026-09-17',0)])[0].latestKg).toBe(0);
});
