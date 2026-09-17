import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import WearableSetup from '@/components/WearableSetup';
(global as any).React = React;
jest.mock('@/components/Logo', () => () => null);
const originalFetch = global.fetch;
let renderer: ReactTestRenderer;
let assign: jest.Mock;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => {
  assign = jest.fn();
  Object.defineProperty(global, 'window', { configurable: true, value: Object.assign(new EventTarget(), { location: { assign } }) });
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); global.fetch = originalFetch; delete (global as any).window; });
async function mount() { await act(async () => { renderer = create(<WearableSetup userId="member-a" />, { createNodeMock: element => element.type === 'dialog' ? { open: false, showModal() { this.open = true; }, close() { this.open = false; } } : null }); }); }
test.each([{ exists: true, connected: false }, { exists: false, connected: true }])('returning members skip setup: %j', async data => {
  global.fetch = jest.fn(async (url) => json(String(url).includes('/profile') ? { exists: data.exists } : { connected: data.connected })) as any;
  await mount(); expect(renderer.toJSON()).toBeNull();
});
test('a first-time no-wearable choice is persisted before the dialog closes', async () => {
  global.fetch = jest.fn(async (url, options) => json(options?.method === 'POST' ? { success: true } : String(url).includes('/profile') ? { exists: false } : { connected: false })) as any;
  await mount(); expect(renderer.root.findAllByType('dialog')).toHaveLength(1);
  await act(async () => renderer.root.findByProps({ value: 'none' }).props.onChange());
  await act(async () => renderer.root.findByType('button').props.onClick());
  const post = (global.fetch as jest.Mock).mock.calls.find(call => call[1]?.method === 'POST');
  expect(JSON.parse(post[1].body)).toMatchObject({ has_wearable: false, wearable_type: null });
  expect(renderer.toJSON()).toBeNull(); expect(assign).toHaveBeenCalledWith('/member/dashboard');
});
test('choosing WHOOP saves the preference and opens the dashboard, without claiming connection', async () => {
  global.fetch = jest.fn(async (url, options) => json(options?.method === 'POST' ? { success: true } : String(url).includes('/profile') ? { exists: false } : { connected: false })) as any;
  await mount(); await act(async () => renderer.root.findByProps({ value: 'whoop' }).props.onChange());
  await act(async () => renderer.root.findByType('button').props.onClick());
  expect(assign).toHaveBeenCalledWith('/member/dashboard');
});
test('failed preference writes keep setup open with a retry instead of losing the choice', async () => {
  global.fetch = jest.fn(async (url, options) => options?.method === 'POST' ? json({}, 503) : json(String(url).includes('/profile') ? { exists: false } : { connected: false })) as any;
  await mount(); await act(async () => renderer.root.findByProps({ value: 'none' }).props.onChange());
  await act(async () => renderer.root.findByType('button').props.onClick());
  expect(renderer.root.findAllByType('dialog')).toHaveLength(1); expect(renderer.root.findByProps({ role: 'alert' }).children.join('')).toContain('could not be saved');
});
