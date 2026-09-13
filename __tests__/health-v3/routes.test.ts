import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { saveDay } from '@/lib/daily-health-score';
import { POST as nutrition } from '@/app/api/health/update-from-nutrition/route';
import { POST as checkin } from '@/app/api/checkin/today/route';
import { GET as leaderboard } from '@/app/api/leaderboard/route';
jest.mock('@/lib/auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/lib/daily-health-score', () => ({
  scoreContext: jest.fn(async () => ({ userId:'member',today:'2026-09-11',balance:123 })),
  saveDay: jest.fn(async () => ({score:88})), readScore: jest.fn(async () => ({score:88})),
}));
jest.mock('@/lib/whoop/sync', () => ({withWhoopLock: async (_: unknown, fn: () => Promise<unknown>) => fn(),SyncBusyError:class extends Error{}}));
const request = (body: unknown) => new NextRequest('http://localhost/api/test',{method:'POST',body:JSON.stringify(body)});
let upsert: jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  (requireAuth as jest.Mock).mockResolvedValue({id:'member'});
  const chain: any = { then: (resolve: (v: unknown) => void) => Promise.resolve({data:{},error:null}).then(resolve) };
  for(const key of ['select','single','eq','maybeSingle']) chain[key]=jest.fn(()=>chain);
  upsert=jest.fn(()=>chain);
  (supabase.from as jest.Mock).mockReturnValue({upsert});
  (supabase.rpc as jest.Mock).mockResolvedValue({data:{hasGym:true,leaderboard:[]},error:null});
});
test('nutrition only stores nutrition, never recalculates a score or issues rewards', async () => {
  for (const totalCalories of [0,1000,3000]) {
    const res=await nutrition(request({memberId:'someone-else',totalCalories}));
    expect(res.status).toBe(200); expect((await res.json()).rewardPoints).toEqual({earned:0,total:123});
  }
  expect((supabase.from as jest.Mock).mock.calls.every(([table])=>table==='daily_checkins')).toBe(true);
  expect(upsert.mock.calls[0][0]).toEqual([{user_id:'member',date:'2026-09-11',calories:0}]);
  expect(saveDay).not.toHaveBeenCalled(); expect(supabase.rpc).not.toHaveBeenCalled();
});
test('check-in rejects forged habit keys and does not credit held rewards', async () => {
  const res=await checkin(request({didWorkout:true,habits:{sauna:true,admin:true,meditation:'true'},calories:1000}));
  expect(res.status).toBe(200);
  expect(upsert.mock.calls[0][0].habits_completed).toBe(1);
  expect(upsert.mock.calls[0][0].habit_details.admin).toBeUndefined();
  expect((await res.json()).rewardPoints).toEqual({earned:0,total:123});
  expect(supabase.rpc).not.toHaveBeenCalled();
});
test('leaderboard only passes the authenticated identity to its tenant-restricted RPC', async () => {
  expect((await leaderboard()).status).toBe(200);
  expect(supabase.rpc).toHaveBeenCalledWith('thrivv_weekly_health_leaderboard',{p_user:'member'});
});
test('unauthenticated callers cannot read ranks or write check-ins/nutrition', async () => {
  (requireAuth as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
  expect((await leaderboard()).status).toBe(401);
  expect((await checkin(request({didWorkout:true}))).status).toBe(401);
  expect((await nutrition(request({memberId:'member',totalCalories:0}))).status).toBe(401);
  expect(supabase.from).not.toHaveBeenCalled(); expect(supabase.rpc).not.toHaveBeenCalled();
});
