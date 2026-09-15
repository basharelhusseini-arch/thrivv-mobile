jest.mock('@/lib/supabase',()=>({supabase:{from:jest.fn()}}));
jest.mock('@/lib/daily-health-score',()=>({scoreContext:jest.fn(),readScore:jest.fn()}));
import { supabase } from '@/lib/supabase';
import { scoreContext, readScore } from '@/lib/daily-health-score';
import { gymRewardStatus } from '@/lib/gym-reward-status';
const w={id:'w',start_at:'2026-09-13T11:00:00+00:00',end_at:'2026-09-13T11:30:00+00:00',sport_name:'Strength',workout_score:49.4,score_input_valid:true,score_state:'SCORED'};
let values:Record<string,unknown>;
const saved={...process.env};
beforeEach(()=>{jest.useFakeTimers().setSystemTime(new Date('2026-09-13T12:00:00Z'));
 (scoreContext as jest.Mock).mockResolvedValue({gymId:'gym',today:'2026-09-13',timezone:'UTC',membershipStart:'2026-09-01'});(readScore as jest.Mock).mockResolvedValue({score:43.5,subtotal:43.5,complete:true});
 values={gym_reward_config:{singleton:true,verification_enabled:true,rewards_enabled:true,effective_date:'2026-09-13',points_per_health_point:2,max_daily_points:100},whoop_workouts:[w],gym_workout_verifications:[],daily_reward_entitlements:[]};
 (supabase.from as jest.Mock).mockImplementation(table=>{const chain:any={};for(const m of ['select','eq','single','maybeSingle','is','gte','order','limit'])chain[m]=()=>chain;chain.then=(resolve:any)=>Promise.resolve({data:values[table],error:null}).then(resolve);return chain;});
});
afterEach(()=>jest.useRealTimers());afterAll(()=>{process.env=saved;});
test('an imported ended workout offers scanning without claiming points credited',async()=>{const s=await gymRewardStatus('member');expect(s.workouts[0]).toMatchObject({canScan:true,verified:false});expect(s.creditedPoints).toBe(0);expect(s.estimatedPoints).toBe(87);});
test('equivalent timestamp representations remain verified; altered timestamps require review',async()=>{
 values.gym_workout_verifications=[{workout_id:'w',gym_id:'gym',start_at:'2026-09-13T11:00:00.000Z',end_at:'2026-09-13T11:30:00.000Z'}];
 expect((await gymRewardStatus('member')).workouts[0]).toMatchObject({canScan:false,verified:true});
 values.whoop_workouts=[{...w,end_at:'2026-09-13T11:40:00Z'}];expect((await gymRewardStatus('member')).workouts[0]).toMatchObject({canScan:false,verified:false,status:expect.stringContaining('needs review')});
});
test('expired scan window and disabled database config never invite an accepted scan',async()=>{jest.setSystemTime(new Date('2026-09-13T15:00:00Z'));expect((await gymRewardStatus('member')).workouts[0].canScan).toBe(false);jest.setSystemTime(new Date('2026-09-13T12:00:00Z'));(values.gym_reward_config as {verification_enabled:boolean}).verification_enabled=false;expect((await gymRewardStatus('member')).workouts[0].canScan).toBe(false);});

test('manual rewards are separate from WHOOP conversion and capped at 50',async()=>{
 values.whoop_workouts=[]; values.whoop_connections=null; values.manual_gym_verifications=null;
 values.daily_checkins={did_workout:true,habit_details:{sauna:true,steamRoom:true,iceBath:true,coldShower:true,meditation:true,stretching:true,sleep:true}};
 Object.assign(values.gym_reward_config as object,{rewards_enabled:false,manual_rewards_enabled:true,manual_effective_at:'2026-09-13T00:00:00Z'});
 const s=await gymRewardStatus('member'); expect(s.manual).toMatchObject({eligible:true,canScan:true,estimatedPoints:50});expect(s.estimatedPoints).toBe(50);expect(s.rewardsEnabled).toBe(true);
 values.whoop_connections={whoop_connected_at:'2026-09-12T00:00:00Z'};
 const connected=await gymRewardStatus('member');expect(connected.manual.canScan).toBe(false);expect(connected.rewardsEnabled).toBe(false);expect(connected.estimatedPoints).toBeNull();
});
test('manual scan requires a checkin and membership; read errors fail closed',async()=>{
 values.whoop_workouts=[];values.daily_checkins={did_workout:false};
 Object.assign(values.gym_reward_config as object,{manual_rewards_enabled:true,manual_effective_at:'2026-09-13T00:00:00Z'});
 expect((await gymRewardStatus('member')).manual.canScan).toBe(false);
 values.daily_checkins={did_workout:true};(scoreContext as jest.Mock).mockResolvedValue({gymId:null,today:'2026-09-13',timezone:'UTC',membershipStart:null});
 expect((await gymRewardStatus('member')).manual.canScan).toBe(false);
});

test('verified WHOOP workouts explain disabled reward conversion without inviting another scan', async () => {
  (values.gym_reward_config as {rewards_enabled:boolean}).rewards_enabled = false;
  values.gym_workout_verifications = [{ workout_id:'w', gym_id:'gym', start_at:w.start_at, end_at:w.end_at }];
  const result = await gymRewardStatus('member');
  expect(result.workouts[0]).toMatchObject({ verified:true, canScan:false, status:'Gym verified — WHOOP rewards not activated' });
  expect(result.creditedPoints).toBe(0);
});

test('connecting WHOOP overrides a saved no-wearable preference without opening manual rewards', async () => {
  values.user_health_profile = { has_wearable: false, wearable_type: null };
  values.whoop_connections = { whoop_connected_at: '2026-09-13T10:00:00Z' };
  values.whoop_workouts = [];
  const result = await gymRewardStatus('member');
  expect(result.mode).toBe('whoop'); expect(result.manual.eligible).toBe(false);
});
test('a WHOOP preference shows setup until connection; today’s imported workout still locks the reward source', async () => {
  values.user_health_profile = { has_wearable: true, wearable_type: 'whoop' };
  values.whoop_connections = null; values.whoop_workouts = [];
  expect((await gymRewardStatus('member')).mode).toBe('whoop_setup');
  values.whoop_workouts = [w];
  const result = await gymRewardStatus('member');
  expect(result.mode).toBe('whoop'); expect(result.manual.eligible).toBe(false);
});
