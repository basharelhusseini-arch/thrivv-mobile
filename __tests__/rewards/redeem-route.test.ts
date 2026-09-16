jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/lib/auth', () => ({ getCurrentUser: jest.fn() }));
jest.mock('@/lib/gym-auth', () => ({ checkAdminAccess: jest.fn() }));
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { checkAdminAccess } from '@/lib/gym-auth';
import { POST } from '@/app/api/rewards/redeem/route';
import { POST as manage, GET as adminCatalog } from '@/app/api/admin/rewards/route';
const requestId = '00000000-0000-4000-8000-000000000001';
const req=(data: object,origin='https://thrivv.dev')=>new NextRequest('https://thrivv.dev/api/rewards/redeem',{ method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data) });
beforeEach(()=>{
 jest.clearAllMocks();
 (getCurrentUser as jest.Mock).mockResolvedValue({id:'real-user'});
 (checkAdminAccess as jest.Mock).mockResolvedValue({ok:false,status:403,reason:'Admin required'});
 (supabase.from as jest.Mock).mockReturnValue({ select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:'real-user'},error:null})})}) });
 (supabase.rpc as jest.Mock).mockResolvedValue({data:{id:'receipt',discount_code:'TEST-CODE'},error:null});
});
test('authenticated member owns the debit regardless of supplied user ID; response is private',async()=>{
 const response=await POST(req({offerId:'offer',requestId,userId:'victim',points:1,discount_code:'FAKE'}));
 expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toContain('no-store');
 expect(supabase.rpc).toHaveBeenCalledWith('thrivv_redeem',{p_user:'real-user',p_offer:'offer',p_request:requestId});
});
test('signed-out, cross-origin and invalid retry requests cannot redeem',async()=>{
 expect((await POST(req({offerId:'offer',requestId},'https://evil.example'))).status).toBe(403);
 expect((await POST(req({offerId:'offer',requestId:'bad'}))).status).toBe(400);
 (getCurrentUser as jest.Mock).mockResolvedValue(null);
 expect((await POST(req({offerId:'offer',requestId}))).status).toBe(401);
 expect(supabase.rpc).not.toHaveBeenCalled();
});
test('member cannot configure offers or access admin catalog',async()=>{
 expect((await manage(req({action:'active',offerId:'offer',requestId,active:true}))).status).toBe(403);
 expect((await adminCatalog()).status).toBe(403); expect(supabase.rpc).not.toHaveBeenCalled();
});
test('admin activation requires explicit partner confirmation',async()=>{
 (checkAdminAccess as jest.Mock).mockResolvedValue({ok:true,user:{id:'admin'}});
 expect((await manage(req({action:'active',offerId:'offer',requestId,reason:'Test approval',active:true}))).status).toBe(400);
 expect(supabase.rpc).not.toHaveBeenCalled();
});
