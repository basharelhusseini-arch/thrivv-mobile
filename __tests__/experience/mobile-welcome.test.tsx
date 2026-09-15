import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MobileWelcome from '@/app/mobile/page';
import { getServerSessionIdentity } from '@/lib/server-session-identity';
import { redirect } from 'next/navigation';
(global as any).React = React;
jest.mock('@/lib/server-session-identity', () => ({ getServerSessionIdentity: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn(() => { throw new Error('redirect'); }) }));
test('signed-out app entrance shows one sign-in action without marketing or gym CTAs', async () => {
  (getServerSessionIdentity as jest.Mock).mockResolvedValue({ status: 'unauthenticated' });
  const html = renderToStaticMarkup(await MobileWelcome());
  expect(html).toContain('Welcome to Thrivv'); expect(html).toContain('href="/member/login"');
  expect(html.match(/<a /g)).toHaveLength(1); expect(html).not.toContain('href="/gym"');
});
test('authenticated app launches go directly to the dashboard', async () => {
  (getServerSessionIdentity as jest.Mock).mockResolvedValue({ status: 'authenticated', userId: 'member' });
  await expect(MobileWelcome()).rejects.toThrow('redirect'); expect(redirect).toHaveBeenCalledWith('/member/dashboard');
});
