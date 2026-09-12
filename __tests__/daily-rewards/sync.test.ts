import { importWorkouts } from '@/lib/whoop/sync';
import { fetchCollection, fetchWorkouts } from '@/lib/whoop/api';
import { scoreContext, saveDay } from '@/lib/daily-health-score';
import { reconcileDailyRewards } from '@/lib/rewards/ledger';
import { supabase } from '@/lib/supabase';
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));
jest.mock('@/lib/whoop/api', () => ({ fetchWorkouts: jest.fn(), fetchCollection: jest.fn() }));
jest.mock('@/lib/whoop/oauth', () => ({ getValidAccessToken: jest.fn() }));
jest.mock('@/lib/daily-health-score', () => ({ scoreContext: jest.fn(), saveDay: jest.fn() }));
jest.mock('@/lib/rewards/ledger', () => ({ reconcileDailyRewards: jest.fn(), rewardBackfillWindow: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  (scoreContext as jest.Mock).mockResolvedValue({ today: '2026-09-12', timezone: 'UTC', userId: 'member' });
  (fetchWorkouts as jest.Mock).mockResolvedValue([]); (fetchCollection as jest.Mock).mockResolvedValue([]);
  (saveDay as jest.Mock).mockResolvedValue({});
});
test('any failed WHOOP collection prevents score writes and rewards', async () => {
  (fetchCollection as jest.Mock).mockRejectedValueOnce(new Error('Transient WHOOP failure'));
  await expect(importWorkouts('member','synthetic-token')).rejects.toThrow();
  expect(saveDay).not.toHaveBeenCalled(); expect(reconcileDailyRewards).not.toHaveBeenCalled();
});
test('foreign WHOOP ownership prevents rewards', async () => {
  (fetchWorkouts as jest.Mock).mockResolvedValue([{ user_id: 999 }]);
  (supabase.from as jest.Mock).mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: { whoop_user_id: 123 } }) }) }) });
  await expect(importWorkouts('member','synthetic-token')).rejects.toThrow('ownership');
  expect(saveDay).not.toHaveBeenCalled(); expect(reconcileDailyRewards).not.toHaveBeenCalled();
});
test('failed score persistence cannot trigger a reward', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });
  (supabase.from as jest.Mock).mockImplementation(table => table === 'whoop_connections'
    ? { select: () => ({ eq: () => ({ single: async () => ({ data: { whoop_user_id: 123 } }) }) }) }
    : { select: () => ({ eq: () => ({ is: () => ({ gte: () => ({ lt: async () => ({ data: [] }) }) }) }) }) });
  (saveDay as jest.Mock).mockRejectedValueOnce(new Error('Database write failed'));
  await expect(importWorkouts('member','synthetic-token')).rejects.toThrow('Database write failed');
  expect(reconcileDailyRewards).not.toHaveBeenCalled();
});
