import { GET } from '@/app/api/leaderboard/route';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
jest.mock('@/lib/auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
test('weekly leaderboard is scoped to the authenticated member and never cached', async () => {
 (requireAuth as jest.Mock).mockResolvedValue({ id: 'member' });
 (supabase.rpc as jest.Mock).mockResolvedValue({ data: { period: 'week', leaderboard: [] }, error: null });
 const res=await GET();expect(res.status).toBe(200);expect(res.headers.get('Cache-Control')).toBe('no-store');
 expect(supabase.rpc).toHaveBeenCalledWith('thrivv_weekly_health_leaderboard',{p_user:'member'});
});
test('unauthenticated users cannot query the leaderboard', async () => {
 (requireAuth as jest.Mock).mockRejectedValue(new Error('Unauthorized'));expect((await GET()).status).toBe(401);expect(supabase.rpc).not.toHaveBeenCalled();
});
test('database failure is reported without substituting a misleading daily ranking', async () => {
 (requireAuth as jest.Mock).mockResolvedValue({ id: 'member' });(supabase.rpc as jest.Mock).mockResolvedValue({ error: { message: 'private database details' } });
 const res=await GET();expect(res.status).toBe(503);expect(await res.text()).not.toContain('private database');
});
