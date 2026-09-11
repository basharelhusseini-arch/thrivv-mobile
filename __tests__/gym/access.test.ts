jest.mock('@/lib/auth', () => ({ getCurrentUser: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { checkGymAccess } from '@/lib/gym-auth';
function setup(email: string, profileEmail: string, owner: string) {
  (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'member', email });
  (supabase.from as jest.Mock).mockImplementation((table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({data: table === 'users' ? { is_admin: false, email: profileEmail } : {id:'gym',owner_email:owner} }) }) }) }));
}
test('gym owner can access their own gym', async () => {
  setup('owner@example.test','owner@example.test','owner@example.test');
  expect((await checkGymAccess('gym')).ok).toBe(true);
});
test('member cannot impersonate a gym owner through profile email', async () => {
  setup('member@example.test','owner@example.test','owner@example.test');
  expect(await checkGymAccess('gym')).toMatchObject({ok:false,status:403});
});
test('other gym owner is denied', async () => {
  setup('other@example.test','other@example.test','owner@example.test');
  expect(await checkGymAccess('gym')).toMatchObject({ok:false,status:403});
});
