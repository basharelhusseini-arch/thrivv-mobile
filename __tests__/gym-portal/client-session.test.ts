import { getClientSession, invalidateClientSession } from '@/lib/client-session';
const user={id:'member',email:'test@example.test',firstName:'Test',lastName:'Member'};
const original=global.fetch;
afterAll(()=>{global.fetch=original;});
afterEach(()=>{invalidateClientSession();jest.restoreAllMocks();});
test('server identity works without localStorage and concurrent callers share one request',async()=>{
 global.fetch=jest.fn(async()=>new Response(JSON.stringify({user,isPlatformAdmin:true}),{status:200})) as any;
 const [a,b]=await Promise.all([getClientSession(),getClientSession()]);expect(a).toEqual({user,isPlatformAdmin:true,status:'authenticated',error:''});expect(b).toEqual(a);expect(global.fetch).toHaveBeenCalledTimes(1);
});
test('only server 401 signals logout, transient server errors are retriable',async()=>{
 global.fetch=jest.fn(async()=>new Response('{}',{status:503})) as any;await expect(getClientSession()).rejects.toThrow('Unable to verify');
 global.fetch=jest.fn(async()=>new Response('{}',{status:401})) as any;expect((await getClientSession()).status).toBe('unauthenticated');
});
test('resolved responses are not cached across later session checks',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce(new Response(JSON.stringify({user}),{status:200})).mockResolvedValueOnce(new Response('{}',{status:401}));
 expect((await getClientSession()).status).toBe('authenticated');expect((await getClientSession()).status).toBe('unauthenticated');expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('an old account request cannot publish identity after an account boundary',async()=>{
 let resolveA!:(response:Response)=>void;
 let resolveB!:(response:Response)=>void;
 global.fetch=jest.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{resolveA=resolve;})).mockImplementationOnce(()=>new Promise<Response>(resolve=>{resolveB=resolve;}));
 const requestA=getClientSession();
 const staleResult=expect(requestA).rejects.toThrow('Session request superseded');
 const signalA=(global.fetch as jest.Mock).mock.calls[0][1].signal as AbortSignal;
 invalidateClientSession();
 expect(signalA.aborted).toBe(true);
 const requestB=getClientSession();
 expect(requestB).not.toBe(requestA);
 resolveA(new Response(JSON.stringify({user}),{status:200}));
 await staleResult;
 // A's finally must not clear B, otherwise a third caller launches another request.
 expect(getClientSession()).toBe(requestB);
 const second={...user,id:'member-b',email:'b@example.test'};
 resolveB(new Response(JSON.stringify({user:second}),{status:200}));
 expect((await requestB).user?.id).toBe('member-b');
 expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('identity that was already parsing when logout occurred is rejected',async()=>{
 let resolveBody!:(data:unknown)=>void;
 const parsing=new Promise(resolve=>{resolveBody=resolve;});
 global.fetch=jest.fn(async()=>({status:200,ok:true,json:()=>parsing})) as any;
 const request=getClientSession();const staleResult=expect(request).rejects.toThrow('Session request superseded');
 await Promise.resolve();
 invalidateClientSession();resolveBody({user});await staleResult;
});
