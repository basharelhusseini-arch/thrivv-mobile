jest.mock('@/lib/auth',()=>({getCurrentUser:jest.fn()}));
import { getCurrentUser } from '@/lib/auth';
import { getServerSessionIdentity } from '@/lib/server-session-identity';
afterEach(()=>{jest.resetAllMocks();});
test('binds the server-authorized identity without serializing profile data or token',async()=>{
 (getCurrentUser as jest.Mock).mockResolvedValue({id:'member-a',email:'private@example.test',firstName:'Private',lastName:'Member'});
 expect(await getServerSessionIdentity()).toEqual({status:'authenticated',userId:'member-a'});
});
test('an absent or revoked server session is explicitly signed out',async()=>{
 (getCurrentUser as jest.Mock).mockResolvedValue(null);expect(await getServerSessionIdentity()).toEqual({status:'unauthenticated'});
});
test('verification outage is kept distinct from a signed-out server identity',async()=>{
 (getCurrentUser as jest.Mock).mockRejectedValue(new Error('Session verification unavailable'));
 expect(await getServerSessionIdentity()).toEqual({status:'unavailable'});
});
