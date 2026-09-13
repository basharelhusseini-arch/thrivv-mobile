jest.mock('@/lib/gym-auth',()=>({checkGymAccess:jest.fn()}));
import {checkGymAccess} from '@/lib/gym-auth';
import {GET} from '@/app/api/gym/[gym_id]/workout-qr/route';
import {NextRequest} from 'next/server';
const gym='00000000-0000-4000-8000-000000000001',user='00000000-0000-4000-8000-000000000002';
const req=new NextRequest('https://gyms.thrivv.dev/api/gym/'+gym+'/workout-qr');const context={params:{gym_id:gym}};
const original=process.env.GYM_WORKOUT_QR_SECRET;
beforeEach(()=>{jest.clearAllMocks();process.env.GYM_WORKOUT_QR_SECRET=Buffer.alloc(32,9).toString('base64');});
afterAll(()=>{if(original===undefined)delete process.env.GYM_WORKOUT_QR_SECRET;else process.env.GYM_WORKOUT_QR_SECRET=original;});
test.each([401,403,503])('access failure %s does not return a code',async status=>{
 (checkGymAccess as jest.Mock).mockResolvedValue({ok:false,status,reason:'Access unavailable'});const r=await GET(req,context);expect(r.status).toBe(status);expect((await r.json()).image).toBeUndefined();
});
test('authorised operator receives a local SVG, and revocation takes effect on next request',async()=>{
 (checkGymAccess as jest.Mock).mockResolvedValue({ok:true,user:{id:user}});
 const r=await GET(req,context);expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store');const d=await r.json();expect(d.image).toMatch(/^data:image\/svg\+xml;base64,/);expect(Buffer.from(d.image.split(',')[1],'base64').toString()).toContain('<svg');expect(d).not.toHaveProperty('token');expect(checkGymAccess).toHaveBeenCalledWith(gym);
 (checkGymAccess as jest.Mock).mockResolvedValue({ok:false,status:403,reason:'Revoked'});expect((await GET(req,context)).status).toBe(403);
});
test('missing setup gives honest unavailable response without secrets',async()=>{
 (checkGymAccess as jest.Mock).mockResolvedValue({ok:true,user:{id:user}});delete process.env.GYM_WORKOUT_QR_SECRET;const r=await GET(req,context);expect(r.status).toBe(503);expect(await r.text()).toContain('complete QR setup');
});
