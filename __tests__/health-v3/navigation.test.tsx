import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync } from 'fs';
import Sidebar from '@/components/Sidebar';
jest.mock('next/navigation', () => ({ usePathname: () => '/member/dashboard', useRouter: () => ({push: jest.fn()}) }));
(global as any).React = React;
test('member sidebar renders the current destinations in order; removed links retain their pages', () => {
  const html = renderToStaticMarkup(<Sidebar />);
  const desktop = html.slice(html.indexOf('<nav'),html.indexOf('</nav>'));
  const links = [...desktop.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  expect(links).toEqual(['/member/dashboard','/member/workouts','/member/scan-workout','/member/rewards','/member/health','/member/nutrition','/member/notifications','/member/wearables','/member/account']);
  expect(desktop).toContain('Wearable');
  expect(existsSync('app/member/wearables/page.tsx')).toBe(true);
  expect(html).toContain('/member/account/support');
  expect(existsSync('app/member/recipes/page.tsx')).toBe(true);
  expect(existsSync('app/member/habits/page.tsx')).toBe(true);
});
