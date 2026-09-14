import React, { useEffect, useState } from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import MainLayout from '@/components/MainLayout';
import { invalidateClientSession, LOGOUT_EVENT, useClientSession } from '@/lib/client-session';
import type {ServerSessionIdentity} from '@/lib/server-session-identity';
let mockPath='/member/dashboard';

jest.mock('next/navigation',()=>({usePathname:()=>mockPath}));
jest.mock('@/components/Sidebar',()=>({__esModule:true,default:()=>null,isGymPortalPath:()=>false}));
jest.mock('@/components/BackgroundLayers',()=>()=>null);
(global as any).React=React;
const userA={id:'member-a',email:'a@example.test',firstName:'A',lastName:'Member'};
const userB={...userA,id:'member-b',email:'b@example.test',firstName:'B'};
const originalFetch=global.fetch;
let renderer:ReactTestRenderer|undefined;
let fakeDocument:EventTarget & {hidden:boolean;documentElement:{dataset:Record<string,string>}};
let fakeWindow:EventTarget & {location:{hostname:string;replace:jest.Mock;reload:jest.Mock}};
let refresh:()=>Promise<void>;
let setDraft:(value:string)=>void;
let unmounted:string[];
function Probe(){
 const {user,refresh:refreshSession}=useClientSession();
 const [draft,updateDraft]=useState(()=>`initial-${user!.id}`);
 refresh=refreshSession;setDraft=updateDraft;
 useEffect(()=>{const id=user!.id;return()=>{unmounted.push(id);};},[user?.id]);
 return <p>{user!.id}:{draft}</p>;
}
beforeEach(()=>{
 unmounted=[];mockPath='/member/dashboard';
 fakeDocument=Object.assign(new EventTarget(),{hidden:false,documentElement:{dataset:{}}});
 fakeWindow=Object.assign(new EventTarget(),{location:{hostname:'localhost',replace:jest.fn(),reload:jest.fn()}});
 Object.defineProperty(global,'document',{configurable:true,value:fakeDocument});
 Object.defineProperty(global,'window',{configurable:true,value:fakeWindow});
});
afterEach(async()=>{
 if(renderer)await act(async()=>{renderer!.unmount();});renderer=undefined;
 invalidateClientSession();global.fetch=originalFetch;
 delete (global as any).document;delete (global as any).window;
});
async function mount(serverIdentity:ServerSessionIdentity={status:'authenticated',userId:userA.id}){await act(async()=>{renderer=create(<MainLayout serverIdentity={serverIdentity}><Probe/></MainLayout>);});}
const text=()=>JSON.stringify(renderer!.toJSON());
const json=(user:typeof userA)=>new Response(JSON.stringify({user}),{status:200});

test('switching authenticated accounts hides old client and server content until full document reload',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce(json(userA)).mockResolvedValueOnce(json(userB));
 await mount();
 act(()=>{setDraft('private-draft-from-A');});expect(text()).toContain('private-draft-from-A');
 await act(async()=>{await refresh();});
 expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
 expect(text()).not.toContain('private-draft-from-A');expect(text()).not.toContain('member-a');expect(text()).not.toContain('member-b');expect(unmounted).toContain('member-a');
 expect(fakeDocument.documentElement.dataset.sessionHidden).toBe('true');
 await act(async()=>{await refresh();});expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('visibility boundary starts a fresh identity check and ignores a late old-account result',async()=>{
 let resolveA!:(response:Response)=>void;let resolveB!:(response:Response)=>void;
 global.fetch=jest.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{resolveA=resolve;})).mockImplementationOnce(()=>new Promise<Response>(resolve=>{resolveB=resolve;}));
 await mount();
 act(()=>{fakeDocument.hidden=true;fakeDocument.dispatchEvent(new Event('visibilitychange'));});
 expect(fakeDocument.documentElement.dataset.sessionHidden).toBe('true');
 act(()=>{fakeDocument.hidden=false;fakeDocument.dispatchEvent(new Event('visibilitychange'));});
 expect(global.fetch).toHaveBeenCalledTimes(2);
 await act(async()=>{resolveB(json(userB));});expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);expect(text()).not.toContain('member-a');expect(text()).not.toContain('member-b');
 await act(async()=>{resolveA(json(userA));});expect(text()).not.toContain('member-a');expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
});

test('storage logout boundary hides current data while verifying the changed session',async()=>{
 let resolveB!:(response:Response)=>void;
 global.fetch=jest.fn().mockResolvedValueOnce(json(userA)).mockImplementationOnce(()=>new Promise<Response>(resolve=>{resolveB=resolve;}));
 await mount();
 const event=new Event('storage');Object.defineProperty(event,'key',{value:LOGOUT_EVENT});
 act(()=>{fakeWindow.dispatchEvent(event);});expect(fakeDocument.documentElement.dataset.sessionHidden).toBe('true');
 await act(async()=>{resolveB(json(userB));});expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);expect(text()).not.toContain('member-a');expect(fakeDocument.documentElement.dataset.sessionHidden).toBe('true');
});

test('refreshing the same authenticated identity preserves current draft and never reloads',async()=>{
 global.fetch=jest.fn().mockImplementation(async()=>json(userA));await mount();
 act(()=>{setDraft('keep-this-draft');});await act(async()=>{await refresh();});
 expect(text()).toContain('keep-this-draft');expect(fakeWindow.location.reload).not.toHaveBeenCalled();expect(fakeDocument.documentElement.dataset.sessionHidden).toBeUndefined();
});


test('initial server-authorized A content never mounts when the first client session is B',async()=>{
 let resolveFirst!:(response:Response)=>void;
 global.fetch=jest.fn(()=>new Promise<Response>(resolve=>{resolveFirst=resolve;})) as any;
 let secretMounts=0;
 function SensitiveServerChild(){secretMounts++;return <p>Server-authorized gym financial data for A</p>;}
 await act(async()=>{renderer=create(<MainLayout serverIdentity={{status:'authenticated',userId:userA.id}}><SensitiveServerChild/></MainLayout>);});
 expect(secretMounts).toBe(0);expect(text()).not.toContain('financial data');
 await act(async()=>{resolveFirst(json(userB));});
 expect(secretMounts).toBe(0);expect(text()).not.toContain('financial data');expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
 expect(fakeDocument.documentElement.dataset.sessionHidden).toBe('true');
 act(()=>{fakeDocument.dispatchEvent(new Event('visibilitychange'));});
 expect(global.fetch).toHaveBeenCalledTimes(1);expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
});

test('a cached signed-out root reloads once after login and a freshly bound document opens normally',async()=>{
 global.fetch=jest.fn().mockImplementation(async()=>json(userB));
 await mount({status:'unauthenticated'});expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);expect(text()).not.toContain('member-b');
 await act(async()=>{renderer!.unmount();});renderer=undefined;
 fakeDocument.documentElement.dataset={};
 await mount({status:'authenticated',userId:userB.id});
 expect(text()).toContain('initial-member-b');expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('unavailable server identity blocks protected content without automatic requests or reload loops',async()=>{
 global.fetch=jest.fn();
 await mount({status:'unavailable'});
 expect(text()).toContain('Unable to verify this workspace');expect(text()).not.toContain('member-a');expect(global.fetch).not.toHaveBeenCalled();expect(fakeWindow.location.reload).not.toHaveBeenCalled();
 act(()=>{renderer!.root.findByType('button').props.onClick();});expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
});

test('public pages remain available during session-store outages',async()=>{
 mockPath='/';global.fetch=jest.fn();
 await act(async()=>{renderer=create(<MainLayout serverIdentity={{status:'unavailable'}}><p>Public landing content</p></MainLayout>);});
 expect(text()).toContain('Public landing content');expect(global.fetch).not.toHaveBeenCalled();expect(fakeWindow.location.reload).not.toHaveBeenCalled();
});
