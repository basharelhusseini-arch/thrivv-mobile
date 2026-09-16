import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import RewardsPage from '@/app/member/rewards/page';
(global as any).React = React;
jest.mock('@/lib/client-session', () => ({ useClientSession: () => ({ user: { id: 'test-member' } }) }));
jest.mock('next/link', () => ({ __esModule: true, default: (props: any) => React.createElement('a', props) }));
jest.mock('@/components/MemberPageHeader', () => ({ __esModule: true, default: () => null }));
const offer = { id:'protein',name:'10% off protein',partner_name:'Test partner',points:600,discount_percent:10,terms:'Selected products',available:true,expires_at:'2099-01-01T00:00:00Z' };
const receipt = { id:'receipt',offer_id:'protein',points:600,status:'issued',discount_code:'TEST-REVEAL',expires_at:offer.expires_at,created_at:'2026-09-16T00:00:00Z',offer_snapshot:offer };
test('select → confirm → reveal; code stays in My redemptions after reload', async () => {
 let redeemed = false;
 const fetchMock = jest.fn(async (url, init) => {
  if (url === '/api/rewards/redeem') { redeemed = true; return { ok:true,json:async()=>({redemption:receipt}) }; }
  return {ok:true,json:async()=>({points:redeemed?0:600,daily:{},offers:[offer],redemptions:redeemed?[receipt]:[],transactions:[]})};
 });
 global.fetch = fetchMock as any;
 let view: TestRenderer.ReactTestRenderer;
 await act(async()=>{view=TestRenderer.create(<RewardsPage/>);});
 const button=(text:string)=>view!.root.findAllByType('button').find(b=>b.children.join('')===text)!;
 expect(JSON.stringify(view!.toJSON())).not.toContain('TEST-REVEAL');
 act(()=>button('Redeem & reveal code').props.onClick());
 expect(JSON.stringify(view!.toJSON())).not.toContain('TEST-REVEAL');
 await act(async()=>{button('Confirm · 600 points').props.onClick();});
 expect(fetchMock.mock.calls.filter(([url])=>url==='/api/rewards/redeem')).toHaveLength(1);
 expect(JSON.stringify(view!.toJSON())).toContain('TEST-REVEAL');
 act(()=>view!.unmount());
 await act(async()=>{view=TestRenderer.create(<RewardsPage/>);});
 act(()=>button('My redemptions').props.onClick());
 expect(JSON.stringify(view!.toJSON())).toContain('TEST-REVEAL');
 act(()=>view!.unmount());
});
