import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { gymDestination, gymLoginPath, gymReturnPath, isGymLogin } from '@/lib/gym-routing';
import { readFileSync } from 'fs';
test('gym hostname entry goes to portal, and cross-host routes preserve the path', () => {
  for (const [url, expected] of [
    ['https://gyms.thrivv.dev/', 'https://gyms.thrivv.dev/gym'],
    ['https://thrivv.dev/gym', 'https://gyms.thrivv.dev/gym'],
    ['https://www.thrivv.dev/gym', 'https://gyms.thrivv.dev/gym'],
    ['https://gyms.thrivv.dev/member/dashboard', 'https://thrivv.dev/member/dashboard'],
  ]) {
    const request = new NextRequest(url, { headers: { host: new URL(url).host } });
    const location = middleware(request).headers.get('location');
    expect(location).toBe(expected);
    const target = new URL(expected);
    expect(middleware(new NextRequest(expected, { headers: { host: target.host } })).headers.get('location')).toBeNull();
  }
});
test('shared login and API stay on gym hostname; preview routing stays local', () => {
  for (const url of ['https://gyms.thrivv.dev/member/login?portal=gym', 'https://gyms.thrivv.dev/api/auth/login', 'http://localhost:3000/gym']) {
    expect(middleware(new NextRequest(url, { headers: { host: new URL(url).host } })).headers.get('location')).toBeNull();
  }
});
test('login accepts only narrow gym destinations, never open redirects', () => {
  const path = '/gym/00000000-0000-4000-8000-000000000001/dashboard';
  expect(gymReturnPath(path)).toBe(path); expect(gymReturnPath('/admin/gyms')).toBe('/admin/gyms');
  for (const bad of ['https://evil.test','//evil.test','/\\evil.test','/%2f%2fevil.test','/gym/../api/auth/logout','/gym?next=https://evil.test',null]) expect(gymReturnPath(bad)).toBe('/gym');
  expect(gymLoginPath(path)).toContain(encodeURIComponent(path));
  expect(isGymLogin('gyms.thrivv.dev', null)).toBe(true);
  expect(isGymLogin('thrivv.dev', null)).toBe(false);
  expect(isGymLogin('localhost', 'gym')).toBe(true);
});
test('admin, single, multiple and no-gym accounts have distinct destinations', () => {
  expect(gymDestination(true, [])).toBe('/admin/gyms');
  expect(gymDestination(false, [{id:'a'}])).toBe('/gym/a/dashboard');
  expect(gymDestination(false, [{id:'a'},{id:'b'}])).toBeNull();
  expect(gymDestination(false, [])).toBeNull();
});
test('both homepage gym CTAs now point at the portal', () => {
  const page = readFileSync('app/page.tsx', 'utf8');
  expect(page.match(/href="\/gym"/g)?.length).toBeGreaterThanOrEqual(2);
  expect(page).not.toMatch(/mailto:bashar@thrivv.dev/);
});
