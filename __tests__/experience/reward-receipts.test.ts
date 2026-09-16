jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/lib/auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/gym-reward-status', () => ({ gymRewardStatus: jest.fn() }));
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { gymRewardStatus } from '@/lib/gym-reward-status';
import { GET } from '@/app/api/rewards/points/route';
const reads: { table: string; field: string; value: unknown }[] = [];
const savedReceipt = { id: 'receipt-1', offer_id: 'offer-1', points: 100, status: 'issued', discount_code: 'TEST-SAVED', expires_at: '2099-01-01T00:00:00Z', offer_snapshot: { name: 'Original offer terms' }, created_at: '2026-09-14T10:00:00Z', reward_offers: { name: 'Existing partner offer' } };
let failedTable = '';
beforeEach(() => {
  jest.clearAllMocks(); reads.length = 0; failedTable = '';
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: [{ id: 'offer-1', name: 'Existing partner offer', points: 100, available: true }], error: null });
  (requireAuth as jest.Mock).mockResolvedValue({ id: 'member-1' });
  (gymRewardStatus as jest.Mock).mockResolvedValue({ redemptionEnabled: true });
  (supabase.from as jest.Mock).mockImplementation(table => {
    const chain: any = {};
    chain.select = () => chain; chain.single = () => chain; chain.order = () => chain; chain.limit = () => chain; chain.gte = () => chain;
    chain.eq = (field: string, value: unknown) => { reads.push({ table, field, value }); return chain; };
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve({ data: table === 'users' ? { reward_points: 240 } : table === 'reward_redemptions' ? [savedReceipt] : table === 'reward_offers' ? [{ id: 'offer-1', name: 'Existing partner offer', points: 100 }] : [], error: table === failedTable ? new Error('Unavailable') : null }).then(resolve);
    return chain;
  });
});
test('saved receipts retain their reference, real offer name, debit and fulfillment status after reload', async () => {
  const response = await GET(); const data = await response.json();
  expect(response.status).toBe(200); expect(data.redemptions).toEqual([savedReceipt]); expect(data.offers[0].name).toBe('Existing partner offer');
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  for (const table of ['reward_redemptions', 'reward_transactions', 'reward_history']) expect(reads).toContainEqual({ table, field: 'user_id', value: 'member-1' });
  expect(supabase.rpc).toHaveBeenCalledWith('thrivv_reward_catalog', { p_actor: 'member-1', p_admin: false });
});
test('disabled redemptions hide offers without hiding already saved receipts', async () => {
  (gymRewardStatus as jest.Mock).mockResolvedValue({ redemptionEnabled: false });
  const data = await (await GET()).json(); expect(data.offers).toEqual([]); expect(data.redemptions).toEqual([savedReceipt]);
});
test('failed receipt reads never turn into an empty successful reward account', async () => {
  failedTable = 'reward_redemptions'; const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect((await GET()).status).toBe(500); log.mockRestore();
});
test('unauthenticated reward reads do not reach the database', async () => {
  (requireAuth as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
  expect((await GET()).status).toBe(401); expect(supabase.from).not.toHaveBeenCalled();
});
