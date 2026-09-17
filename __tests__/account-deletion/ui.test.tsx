import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import DeleteAccount from '@/components/DeleteAccount';
import { clearClientAccountData } from '@/lib/client-session';
(global as any).React=React;
jest.mock('next/link',()=>({__esModule:true,default:({children,...props}:any)=><a {...props}>{children}</a>}));
jest.mock('@/lib/client-session',()=>({clearClientAccountData:jest.fn()}));
const oldFetch=global.fetch, oldWindow=(global as any).window;
let view:TestRenderer.ReactTestRenderer;
const showModal=jest.fn(),close=jest.fn(),replace=jest.fn();
const fill=async()=>{await act(async()=>{const inputs=view.root.findAllByType('input'); inputs[0].props.onChange({target:{value:'password'}}); inputs[1].props.onChange({target:{value:'DELETE'}});});};
const submit=()=>view.root.findByType('form').props.onSubmit({preventDefault:jest.fn()});
beforeEach(async()=>{
 jest.clearAllMocks(); global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({success:true})});
 (global as any).window={location:{replace}};
 await act(async()=>{view=TestRenderer.create(<DeleteAccount memberId="member-a"/>,{createNodeMock:element=>element.type==='dialog'?{showModal,close}:null});});
});
afterEach(()=>{act(()=>view.unmount());global.fetch=oldFetch;(global as any).window=oldWindow;});
test('destructive button disabled until password and explicit DELETE confirmation; cancel sends nothing',async()=>{
 expect(view.root.findByProps({type:'submit'}).props.disabled).toBe(true);
 await act(async()=>{await submit();});
 expect(global.fetch).not.toHaveBeenCalled();
 await fill();
 expect(view.root.findByProps({type:'submit'}).props.disabled).toBe(false);
 act(()=>view.root.findAllByType('button').find(x=>x.children.includes('Keep my account'))!.props.onClick());
 expect(close).toHaveBeenCalled();
 expect(view.root.findAllByType('input')[0].props.value).toBe('');
 expect(global.fetch).not.toHaveBeenCalled();
});
test('success clears client data and redirects to confirmation',async()=>{
 await fill(); await act(async()=>{await submit();});
 expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual({memberId:'member-a',password:'password',confirmation:'DELETE'});
 expect(clearClientAccountData).toHaveBeenCalledTimes(1); expect(replace).toHaveBeenCalledWith('/member/login?accountDeleted=1');
});
test('failed deletion displays error and preserves session',async()=>{
 (global.fetch as jest.Mock).mockResolvedValue({ok:false,json:async()=>({error:'Incorrect password.'})});
 await fill(); await act(async()=>{await submit();});
 expect(view.root.findByProps({role:'alert'}).children).toEqual(['Incorrect password.']);
 expect(clearClientAccountData).not.toHaveBeenCalled(); expect(replace).not.toHaveBeenCalled();
 expect(view.root.findAllByType('input')[0].props.value).toBe('');
});
test('pending request cannot submit twice or dismiss confirmation',async()=>{
 let finish!:(x:any)=>void;
 (global.fetch as jest.Mock).mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 await fill(); let pending!:Promise<void>;
 act(()=>{pending=submit();});
 await act(async()=>{await submit();});
 expect(global.fetch).toHaveBeenCalledTimes(1);
 const before=close.mock.calls.length;
 act(()=>view.root.findByType('dialog').props.onCancel({preventDefault:jest.fn()}));
 expect(close).toHaveBeenCalledTimes(before);
 await act(async()=>{finish({ok:true,json:async()=>({success:true})});await pending;});
});
