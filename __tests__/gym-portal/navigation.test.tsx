import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Sidebar from '@/components/Sidebar';
import MainLayout from '@/components/MainLayout';

let mockPath = '/gym';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/components/BackgroundLayers', () => () => null);
(global as any).React = React;

function render(path: string, cachedMember = true, layout = false) {
  mockPath = path;
  // Render both desktop and mobile markup with/without cached member data.
  // Effects do not run during server rendering; supply their settled state.
  const spy = jest.spyOn(React, 'useState');
  let call = 0;
  spy.mockImplementation(((initial: unknown) => {
    call++;
    if (layout && call <= 2) return [call === 1 ? cachedMember : false, jest.fn()];
    return [initial === null && cachedMember ? { id: 'member', name: 'Test Member', email: 'test@example.invalid' } : initial, jest.fn()];
  }) as any);
  try {
    return renderToStaticMarkup(layout ? <MainLayout><div>Portal content</div></MainLayout> : <Sidebar />);
  } finally { spy.mockRestore(); }
}

test.each(['/gym', '/gym/123/dashboard', '/admin/gyms'])('gym chrome ignores saved member profile on %s', path => {
  const html = render(path);
  expect(html).toContain('Gym portal navigation');
  expect(html).toContain(path === '/admin/gyms' ? 'Platform Admin' : 'Your gyms');
  expect(html).not.toMatch(/href="\/member\/(dashboard|workouts|nutrition|health|wearables|account)"/);
  expect(html).toContain('href="/gym"');
});

test('gym dashboard link targets the current gym and mobile layout has no empty tabs', () => {
  const html = render('/gym/123/dashboard');
  expect(html).toContain('href="/gym/123/dashboard"');
  expect(html).toContain('grid-cols-3');
  expect(html).not.toContain('grid-cols-5');
});

test('member navigation retains all existing destinations', () => {
  const html = render('/member/dashboard');
  for (const route of ['dashboard', 'workouts', 'nutrition', 'bookings', 'health', 'rewards', 'wearables', 'account']) {
    expect(html).toContain(`href="/member/${route}"`);
  }
  expect(html).toContain('grid-cols-5');
  expect(html).not.toContain('Gym portal navigation');
});

test.each([true, false])('gym layout includes gym chrome with cached member=%s', cached => {
  expect(render('/gym', cached, true)).toContain('Gym portal navigation');
});

test.each(['/member/login', '/member/signup', '/'])('public route %s stays free of sidebar', path => {
  const html = render(path, true, true);
  expect(html).toContain('Portal content');
  expect(html).not.toContain('<aside');
});

test('unauthenticated member route keeps existing layout behavior', () => {
  expect(render('/member/dashboard', false, true)).not.toContain('<aside');
});
