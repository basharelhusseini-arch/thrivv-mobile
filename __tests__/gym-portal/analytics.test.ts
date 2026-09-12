jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
import { supabase } from '@/lib/supabase';
import { gymDashboardData } from '@/lib/gym-dashboard-data';
import { activeInWindow, membershipCheckins, type CheckinRow, type MemberRow } from '@/lib/gym-analytics';
const gym = {id:'gym-a',name:'Synthetic Gym',owner_email:'',pilot_start_date:null,pilot_member_count:0,created_at:'2026-01-01'};
beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(new Date('2026-09-12T12:00:00Z')); });
afterEach(() => jest.useRealTimers());
test('activity excludes pre-membership, other members, future dates and unknown memberships', () => {
  const members = [{id:'one',membership_start_date:'2026-09-10'},{id:'unknown',membership_start_date:null}] as MemberRow[];
  const rows = [{user_id:'one',date:'2026-09-09'},{user_id:'one',date:'2026-09-10'},{user_id:'one',date:'2026-09-11'},{user_id:'one',date:'2026-09-13'},{user_id:'unknown',date:'2026-09-11'},{user_id:'other-gym',date:'2026-09-11'}] as CheckinRow[];
  const eligible=membershipCheckins(members,rows); expect(eligible).toHaveLength(2); expect(activeInWindow(eligible,7)).toBe(1);
});
test('pagination counts all members; no email, sleep, calorie or token data is requested', async () => {
  const requests: any[]=[];
  (supabase.from as jest.Mock).mockImplementation(table => {
    const chain: any={ select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),order:jest.fn().mockReturnThis(),in:jest.fn().mockReturnThis(),gte:jest.fn().mockReturnThis(),lte:jest.fn().mockReturnThis(),range:jest.fn(async (from:number) => ({error:null,data:table==='users' ? Array.from({length:from===0?500:1},(_,i)=>({id:`u${from+i}`,first_name:'Test',last_name:'Member',created_at:'2026-09-01',membership_start_date:'2026-09-01'})):[]}))};
    requests.push({table,chain});return chain;
  });
  const data=await gymDashboardData(gym,false,true); expect(data.totals.total_members).toBe(501); expect(data.totals.active_this_week).toBe(0);
  expect(data.earned_points).toMatchObject({status:'not_activated',value:null}); expect(data.verified_scans.total).toBeNull();
  for (const {table,chain} of requests) {
    expect(chain.select.mock.calls[0][0]).not.toMatch(/email|calories|sleep|token|reward_points/);
    if(table==='users') expect(chain.eq).toHaveBeenCalledWith('gym_id','gym-a');
  }
  expect(supabase.from).not.toHaveBeenCalledWith('reward_history');
});
test('query failures reject rather than become zero metrics', async () => {
  (supabase.from as jest.Mock).mockReturnValue({select:()=>({eq:()=>({order:()=>({range:async()=>({error:{message:'fail'},data:null})})})})});
  await expect(gymDashboardData(gym,false,true)).rejects.toThrow('Member data unavailable');
});
