jest.mock('@/lib/auth', () => ({ getCurrentUser: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { checkGymAccess, gymPortalAccess } from '@/lib/gym-auth';
function setup(operator: boolean, admin = false, failed = false) {
  (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'member', email: 'owner@example.test' });
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    const chain: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: async () => ({
      data: table === 'users' ? { is_admin: admin } : table === 'gym_operators' ? operator ? {user_id:'member'} : null : {id:'gym',owner_email:'owner@example.test'},
      error: failed && table === 'gym_operators' ? { message: 'unavailable' } : null,
    }) }; return chain;
  });
}
beforeEach(() => jest.clearAllMocks());
test('explicit operator can access their gym', async () => {
  setup(true); expect((await checkGymAccess('gym')).ok).toBe(true);
  const operator = (supabase.from as jest.Mock).mock.results[1].value;
  expect(operator.eq).toHaveBeenCalledWith('gym_id', 'gym'); expect(operator.eq).toHaveBeenCalledWith('user_id','member');
});
test('even an exact owner email match cannot replace an operator assignment', async () => {
  setup(false); expect(await checkGymAccess('gym')).toMatchObject({ok:false,status:403});
  expect(supabase.from).not.toHaveBeenCalledWith('gyms');
});
test('missing operator schema fails closed; revocation takes effect on the next request', async () => {
  setup(true,false,true); expect(await checkGymAccess('gym')).toMatchObject({ok:false,status:503});
  setup(false); expect(await checkGymAccess('gym')).toMatchObject({ok:false,status:403});
});
test('platform admin does not require a gym operator assignment', async () => {
  setup(false,true); expect(await checkGymAccess('gym')).toMatchObject({ok:true,isAdmin:true});
  expect(supabase.from).not.toHaveBeenCalledWith('gym_operators');
});
test('signed-out requests read no database data', async () => {
  (getCurrentUser as jest.Mock).mockResolvedValue(null);
  expect(await checkGymAccess('gym')).toMatchObject({ok:false,status:401});
  expect((await gymPortalAccess()).user).toBeNull(); expect(supabase.from).not.toHaveBeenCalled();
});
test('portal lists only assigned gym IDs and supports a selector for multiple gyms', async () => {
  (getCurrentUser as jest.Mock).mockResolvedValue({id:'operator',email:'irrelevant@example.test'});
  const eq=jest.fn(async () => ({data:[{gym_id:'b',gyms:{id:'b',name:'Beta'}},{gym_id:'a',gyms:{id:'a',name:'Alpha'}}],error:null}));
  (supabase.from as jest.Mock).mockImplementation(table=>table==='users'?{select:()=>({eq:()=>({maybeSingle:async()=>({data:{is_admin:false},error:null})})})}:{select:()=>({eq})});
  expect((await gymPortalAccess()).gyms.map(g=>g.id)).toEqual(['a','b']); expect(eq).toHaveBeenCalledWith('user_id','operator');
});
