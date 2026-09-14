import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import WorkspaceLink from '@/components/WorkspaceLink';
(global as any).React=React;
let renderer:ReactTestRenderer;
let assign:jest.Mock;
const originalFetch=global.fetch;
beforeEach(async()=>{
 assign=jest.fn();Object.defineProperty(global,'window',{configurable:true,value:{location:{hostname:'www.thrivv.dev',assign}}});
 await act(async()=>{renderer=create(<WorkspaceLink href="/admin/gyms">Platform Admin</WorkspaceLink>);});
});
afterEach(()=>{act(()=>renderer.unmount());delete (global as any).window;global.fetch=originalFetch;});
const click=()=>renderer.root.findByType('a').props.onClick({preventDefault:jest.fn()});
test('waits for authenticated migration then fully navigates; double-click sends one request',async()=>{
 let resolve!:(response:Response)=>void;
 global.fetch=jest.fn(()=>new Promise<Response>(done=>{resolve=done;})) as any;
 let first!:Promise<void>;
 act(()=>{first=click();void click();});expect(global.fetch).toHaveBeenCalledTimes(1);expect(assign).not.toHaveBeenCalled();expect(renderer.root.findByType('a').props['aria-busy']).toBe(true);
 await act(async()=>{resolve(new Response(JSON.stringify({success:true,destination:'https://gyms.thrivv.dev/admin/gyms'})));await first;});
 expect(assign).toHaveBeenCalledWith('https://gyms.thrivv.dev/admin/gyms');expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/auth/workspace');
});
test('failed migration shows an actionable error without navigating and allows retry',async()=>{
 global.fetch=jest.fn(async()=>new Response(JSON.stringify({error:'Please sign in again to switch workspaces'}),{status:401})) as any;
 await act(async()=>{await click();});expect(assign).not.toHaveBeenCalled();expect(renderer.root.findByProps({role:'alert'}).children.join('')).toContain('Please sign in again');
 expect(renderer.root.findByType('a').props['aria-disabled']).toBeUndefined();
});
test('server response cannot send the member to an untrusted URL',async()=>{
 global.fetch=jest.fn(async()=>new Response(JSON.stringify({success:true,destination:'https://evil.test'}))) as any;
 await act(async()=>{await click();});expect(assign).not.toHaveBeenCalled();expect(renderer.root.findByProps({role:'alert'})).toBeDefined();
});
