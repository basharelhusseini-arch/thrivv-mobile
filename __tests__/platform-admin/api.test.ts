jest.mock('@/lib/gym-auth', () => ({ checkAdminAccess: jest.fn() }));
jest.mock('@/lib/auth', () => ({ getCurrentUser: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/lib/support-email', () => ({ notifySupport: jest.fn() }));
import { NextRequest } from 'next/server';
import { checkAdminAccess } from '@/lib/gym-auth';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { notifySupport } from '@/lib/support-email';
import { GET as list, POST as create } from '@/app/api/support/tickets/route';
import { GET as thread } from '@/app/api/support/tickets/[ticket_id]/route';
import { GET as overview } from '@/app/api/admin/overview/route';
const id='00000000-0000-4000-8000-000000000001';
function query(data: unknown) {
 const q: any={}; for(const name of ['select','eq','order','range']) q[name]=jest.fn().mockReturnValue(q);
 q.maybeSingle=jest.fn().mockResolvedValue({data,error:null});
 q.then=(resolve: any)=>Promise.resolve({data,error:null,count:0}).then(resolve); return q;
}
const req=(body: object={}, origin='https://thrivv.dev')=>new NextRequest('https://thrivv.dev/api/support/tickets',{method:'POST',headers:{origin},body:JSON.stringify({requestId:id,subject:'Need help',message:'Private question',...body})});
beforeEach(()=>{jest.resetAllMocks();(getCurrentUser as jest.Mock).mockResolvedValue({id:'member'});(checkAdminAccess as jest.Mock).mockResolvedValue({ok:false,status:403,reason:'Admin required'});});
test('ordinary accounts cannot read the admin overview or support inbox',async()=>{
 expect((await overview()).status).toBe(403);
 expect((await list(new NextRequest('https://thrivv.dev/api/support/tickets?scope=admin'))).status).toBe(403);
 expect(supabase.from).not.toHaveBeenCalled();expect(supabase.rpc).not.toHaveBeenCalled();
});
test('member ticket list always filters to the session identity',async()=>{
 const tickets=query([]);(supabase.from as jest.Mock).mockReturnValueOnce(query({id:'member'})).mockReturnValueOnce(tickets);
 const res=await list(new NextRequest('https://thrivv.dev/api/support/tickets?user_id=other'));
 expect(res.status).toBe(200);expect(tickets.eq).toHaveBeenCalledWith('user_id','member');expect(res.headers.get('cache-control')).toContain('no-store');
});
test('cross-member thread requests are blocked before loading messages',async()=>{
 (supabase.from as jest.Mock).mockReturnValueOnce(query({id:'member'})).mockReturnValueOnce(query({id,user_id:'other'}));
 expect((await thread(new NextRequest('https://thrivv.dev/api/support/tickets/'+id),{params:{ticket_id:id}})).status).toBe(403);
 expect(supabase.from).not.toHaveBeenCalledWith('support_messages');
});
test('cross-origin submissions do not write tickets',async()=>{
 (supabase.from as jest.Mock).mockReturnValue(query({id:'member'}));
 expect((await create(req({},'https://evil.test'))).status).toBe(403);expect(supabase.rpc).not.toHaveBeenCalled();
});
test('notification failure preserves a saved ticket and uses the session actor',async()=>{
 (supabase.from as jest.Mock).mockReturnValue(query({id:'member'}));(supabase.rpc as jest.Mock).mockResolvedValue({data:id,error:null});(notifySupport as jest.Mock).mockRejectedValue(new Error('private provider detail'));
 const res=await create(req({actor:'forged'}));expect(res.status).toBe(201);expect(await res.json()).toEqual({id,notification:'unknown'});
 expect(supabase.rpc).toHaveBeenCalledWith('thrivv_support_message',expect.objectContaining({p_actor:'member',p_request:id}));
});
test('failed overview queries return unavailable, not invented zeros or database details',async()=>{
 (checkAdminAccess as jest.Mock).mockResolvedValue({ok:true,user:{id:'admin'}});(supabase.rpc as jest.Mock).mockResolvedValue({error:{message:'private schema failure'}});
 const res=await overview();expect(res.status).toBe(503);expect(await res.text()).not.toContain('private schema failure');
});
