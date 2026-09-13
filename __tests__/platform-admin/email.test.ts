jest.mock('@/lib/supabase',()=>({supabase:{from:jest.fn()}}));
import {supabase} from '@/lib/supabase';
import {notifySupport} from '@/lib/support-email';
const env={...process.env};const originalFetch=global.fetch;
function chain(result: any){const q:any={};for(const k of ['update','eq','neq','in','select'])q[k]=jest.fn().mockReturnValue(q);q.single=jest.fn().mockResolvedValue(result);q.maybeSingle=jest.fn().mockResolvedValue(result);q.then=(resolve:any)=>Promise.resolve(result).then(resolve);return q;}
beforeEach(()=>{jest.resetAllMocks();delete process.env.SUPPORT_EMAIL_ENABLED;global.fetch=jest.fn() as any;});
afterAll(()=>{process.env=env;global.fetch=originalFetch;});
function enabled(){process.env.SUPPORT_EMAIL_ENABLED='true';process.env.RESEND_API_KEY='synthetic-key';process.env.SUPPORT_EMAIL_FROM='support@example.test';}
test('notifications are off by default and never call an email provider',async()=>{
 (supabase.from as jest.Mock).mockReturnValue(chain({error:null}));expect(await notifySupport('ticket')).toBe('unavailable');expect(global.fetch).not.toHaveBeenCalled();
});
test('email includes only a ticket reference and protected link, with stable duplicate protection',async()=>{
 enabled();(supabase.from as jest.Mock).mockReturnValueOnce(chain({data:{email_status:'pending',email_attempts:0},error:null})).mockReturnValueOnce(chain({data:{id:'ticket'},error:null})).mockReturnValue(chain({error:null}));
 (global.fetch as jest.Mock).mockResolvedValue({ok:true});expect(await notifySupport('ticket')).toBe('accepted');
 const [,options]=(global.fetch as jest.Mock).mock.calls[0];expect(options.headers['Idempotency-Key']).toBe('support-ticket/ticket');const body=JSON.parse(options.body);expect(body.to).toEqual(['basharelhusseini@gmail.com']);expect(Object.keys(body).sort()).toEqual(['from','subject','text','to']);expect(body.text).toContain('/admin/gyms?tab=Support&ticket=ticket');
});
test('losing a concurrent claim does not send another notification',async()=>{
 enabled();(supabase.from as jest.Mock).mockReturnValueOnce(chain({data:{email_status:'pending',email_attempts:0},error:null})).mockReturnValueOnce(chain({data:null,error:null}));expect(await notifySupport('ticket')).toBe('sending');expect(global.fetch).not.toHaveBeenCalled();
});
test('old ambiguous attempts do not resend outside provider deduplication window',async()=>{
 enabled();(supabase.from as jest.Mock).mockReturnValueOnce(chain({data:{email_status:'failed',email_attempts:1,email_first_attempt_at:new Date(Date.now()-86400000).toISOString()},error:null})).mockReturnValue(chain({error:null}));expect(await notifySupport('ticket')).toBe('unknown');expect(global.fetch).not.toHaveBeenCalled();
});
