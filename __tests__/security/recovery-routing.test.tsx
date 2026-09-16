import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { NextRequest } from 'next/server';
import { execFileSync } from 'node:child_process';
import MainLayout from '@/components/MainLayout';
import MemberLoginPage from '@/app/member/login/page';
import { middleware } from '@/middleware';

let mockPath = '/member/reset-password';
jest.mock('next/navigation', () => ({ usePathname: () => mockPath }));
jest.mock('next/link', () => ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>);
jest.mock('@/components/Sidebar', () => ({ __esModule: true, default: () => null, isGymPortalPath: () => false }));
jest.mock('@/components/BackgroundLayers', () => () => null);
jest.mock('@/components/WearableSetup', () => () => null);
jest.mock('@/components/Logo', () => () => null);
jest.mock('@/components/Reveal', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('@/lib/client-session', () => ({
  ClientSessionProvider: () => { throw new Error('Recovery must not mount normal session handling'); },
}));
(global as any).React = React;

let renderer: ReactTestRenderer | undefined;
let replace: jest.Mock;
const originalWindow = Object.getOwnPropertyDescriptor(global, 'window');
const originalDocument = Object.getOwnPropertyDescriptor(global, 'document');

beforeEach(() => {
  mockPath = '/member/reset-password';
  replace = jest.fn();
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: { location: { hash: '', hostname: 'www.thrivv.dev', replace } },
  });
  Object.defineProperty(global, 'document', {
    configurable: true,
    value: { documentElement: { dataset: { sessionHidden: 'true' } } },
  });
});

afterEach(() => {
  if (renderer) act(() => renderer!.unmount());
  renderer = undefined;
  if (originalWindow) Object.defineProperty(global, 'window', originalWindow);
  else delete (global as any).window;
  if (originalDocument) Object.defineProperty(global, 'document', originalDocument);
  else delete (global as any).document;
});

async function mount() {
  await act(async () => {
    renderer = create(<MainLayout serverIdentity={{ status: 'unavailable' }}><p>Public recovery form</p></MainLayout>);
  });
}

test.each(['/member/forgot-password', '/member/reset-password', '/privacy'])(
  '%s stays public even when normal session verification is unavailable',
  async (path) => {
    mockPath = path;
    await mount();
    expect(JSON.stringify(renderer!.toJSON())).toContain('Public recovery form');
    expect(document.documentElement.dataset.sessionHidden).toBeUndefined();
    expect(replace).not.toHaveBeenCalled();
  },
);

test.each(['/', '/member/dashboard', '/member/login', '/mobile'])(
  'recovery arriving at %s goes only to the fixed reset path, before protected content mounts',
  async (path) => {
    mockPath = path;
    window.location.hash = '#access_token=test-token&type=recovery&refresh_token=never-forward&next=https%3A%2F%2Fevil.test';
    await mount();
    expect(replace).toHaveBeenCalledWith('/member/reset-password#type=recovery&access_token=test-token');
    if (path === '/member/dashboard') expect(JSON.stringify(renderer!.toJSON())).not.toContain('Public recovery form');
  },
);

test('login portal routing cannot overtake recovery even when public login renders immediately', async () => {
  mockPath = '/member/login';
  window.location.hostname = 'gyms.thrivv.dev';
  window.location.search = '?portal=member';
  window.location.hash = '#type=recovery&access_token=test-token';
  await act(async () => {
    renderer = create(<MainLayout serverIdentity={{ status: 'unavailable' }}><MemberLoginPage /></MainLayout>);
  });
  expect(JSON.stringify(renderer!.toJSON())).toContain('Welcome');
  expect(replace).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenCalledWith('/member/reset-password#type=recovery&access_token=test-token');
});

test('ordinary login still switches to the requested production portal', async () => {
  mockPath = '/member/login';
  window.location.hostname = 'gyms.thrivv.dev';
  window.location.search = '?portal=member';
  await act(async () => {
    renderer = create(<MainLayout serverIdentity={{ status: 'unavailable' }}><MemberLoginPage /></MainLayout>);
  });
  expect(replace).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenCalledWith('https://thrivv.dev/member/login?portal=member');
});

test('the reset page retains its fragment for the recovery form to consume without redirecting', async () => {
  window.location.hash = '#access_token=test-token&type=recovery';
  await mount();
  expect(replace).not.toHaveBeenCalled();
  expect(window.location.hash).toContain('access_token=test-token');
});

test('ordinary marketing section fragments never trigger recovery', async () => {
  mockPath = '/';
  window.location.hash = '#how-it-works';
  await mount();
  expect(replace).not.toHaveBeenCalled();
});

test('duplicate recovery credentials are not normalized into an accepted token', async () => {
  mockPath = '/';
  window.location.hash = '#type=recovery&access_token=first&access_token=second';
  await mount();
  expect(replace).toHaveBeenCalledWith('/member/reset-password#type=recovery');
});

test.each(['/member/forgot-password', '/member/reset-password', '/privacy', '/api/auth/forgot-password', '/api/auth/reset-password'])(
  'shared route %s stays on the gym hostname',
  (path) => {
    const response = middleware(new NextRequest(`https://gyms.thrivv.dev${path}`, { headers: { host: 'gyms.thrivv.dev' } }));
    expect(response.headers.get('location')).toBeNull();
  },
);

test('recovery pages and APIs disable caching, indexing, and outgoing referrers', () => {
  const result = execFileSync(process.execPath, ['--input-type=module', '-e',
    "import config from './next.config.mjs'; console.log(JSON.stringify(await config.headers()));",
  ], { cwd: process.cwd(), encoding: 'utf8' });
  const rules = JSON.parse(result) as Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  for (const source of ['/member/forgot-password', '/member/reset-password', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/reset-password/validate']) {
    const rule = rules.find((item) => item.source === source);
    expect(rule?.headers).toEqual(expect.arrayContaining([
      { key: 'Cache-Control', value: 'no-store, max-age=0' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ]));
  }
});
