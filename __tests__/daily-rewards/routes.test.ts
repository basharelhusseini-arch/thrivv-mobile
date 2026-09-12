import { GET } from '@/app/api/rewards/points/route';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { dailyRewardStatus, formatRewardPoints } from '@/lib/rewards/daily';
import { reconcileDailyRewards, rewardBackfillWindow } from '@/lib/rewards/ledger';

jest.mock('@/lib/auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));
const previousFlag = process.env.DAILY_HEALTH_REWARDS_ENABLED;
beforeEach(() => { jest.clearAllMocks(); delete process.env.DAILY_HEALTH_REWARDS_ENABLED; });
afterAll(() => { if (previousFlag === undefined) delete process.env.DAILY_HEALTH_REWARDS_ENABLED; else process.env.DAILY_HEALTH_REWARDS_ENABLED = previousFlag; });

test('unauthenticated member cannot read any balance', async () => {
  (requireAuth as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
  expect((await GET()).status).toBe(401); expect(supabase.rpc).not.toHaveBeenCalled();
});
test('balance failure is unavailable, never a fabricated zero', async () => {
  (requireAuth as jest.Mock).mockResolvedValue({ id: 'member' });
  (supabase.rpc as jest.Mock).mockResolvedValue({ error: { message: 'private database detail' } });
  const response = await GET(); expect(response.status).toBe(503);
  const body = await response.json(); expect(body.points).toBeUndefined(); expect(body.error).not.toContain('private database detail');
});
test('summary uses authenticated identity, decimal balance and server activation, without crediting on reads', async () => {
  process.env.DAILY_HEALTH_REWARDS_ENABLED = 'true';
  (requireAuth as jest.Mock).mockResolvedValue({ id: 'member' });
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: { points: 43.5, enabled: true, activationDate: '2026-09-12', date: '2026-09-12', healthScore: 43.5, complete: true, creditedToday: null } });
  const response = await GET(); const data = await response.json();
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  expect(supabase.rpc).toHaveBeenCalledWith('thrivv_reward_summary', { p_user: 'member' });
  expect(data.points).toBe(43.5); expect(data.today).toEqual({ status: 'estimated', amount: 43.5 });
});
test('provisional, disabled, credited zero, and decimal display are distinct', () => {
  expect(dailyRewardStatus(true, '2026-09-12', '2026-09-12', 43.5, false, null)).toEqual({ status: 'pending', amount: null });
  expect(dailyRewardStatus(false, '2026-09-12', '2026-09-12', 43.5, true, null).status).toBe('disabled');
  expect(dailyRewardStatus(true, '2026-09-13', '2026-09-12', 43.5, true, null).status).toBe('disabled');
  expect(dailyRewardStatus(true, '2026-09-12', '2026-09-12', 0, true, 0)).toEqual({ status: 'credited', amount: 0 });
  expect(formatRewardPoints(null)).toBe('—'); expect(formatRewardPoints(43.5)).toBe('43.5');
});
test('disabled reward processing does not require a deployed migration', async () => {
  expect(await reconcileDailyRewards('member', 'start', 'end')).toEqual({ enabled: false });
  expect(await rewardBackfillWindow('member', '2026-09-30', 'UTC')).toBeNull();
  expect(supabase.rpc).not.toHaveBeenCalled(); expect(supabase.from).not.toHaveBeenCalled();
});
test('credit API sends identity and verified window, never an amount; failures request retry', async () => {
  process.env.DAILY_HEALTH_REWARDS_ENABLED = 'true';
  (supabase.rpc as jest.Mock).mockResolvedValue({ error: {} });
  await expect(reconcileDailyRewards('member', 'start', 'end')).rejects.toThrow('retry');
  expect(supabase.rpc).toHaveBeenCalledWith('thrivv_reconcile_daily_rewards', { p_user: 'member', p_start: 'start', p_end: 'end' });
});
test('historical recovery is bounded to seven days and rotates after catching up', async () => {
  process.env.DAILY_HEALTH_REWARDS_ENABLED = 'true';
  const single = jest.fn().mockResolvedValueOnce({ data: { enabled: true, activation_date: '2026-09-12' } }).mockResolvedValueOnce({ data: { reward_sync_cursor: '2026-09-23' } });
  (supabase.from as jest.Mock).mockImplementation(() => ({ select: () => ({ eq: () => ({ single }) }) }));
  const window = await rewardBackfillWindow('member', '2026-09-30', 'UTC');
  expect(window).toMatchObject({ first: '2026-09-12', after: '2026-09-19', start: '2026-09-12T00:00:00.000Z', end: '2026-09-19T00:00:00.000Z' });
});
