import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Sidebar from '@/components/Sidebar';
import MainLayout from '@/components/MainLayout';

let mockPath = '/gym';
jest.mock('next/navigation', () => ({ usePathname: () => mockPath }));
jest.mock('@/components/BackgroundLayers', () => () => null);
(global as any).React = React;
const member={id:'member',name:'Test Member',email:'test@example.invalid'};
function render(path:string,admin=false){mockPath=path;return renderToStaticMarkup(<Sidebar memberData={member} isPlatformAdmin={admin}/>);}

test.each(['/gym','/gym/123/dashboard','/admin/gyms'])('gym chrome stays in gym workspace on %s', path=>{
 const html=render(path);expect(html).toContain('Gym portal navigation');expect(html).toContain('Switch workspace');
 // Only the workspace switch links into the member app.
 expect(html).not.toMatch(/href="\/member\/(workouts|nutrition|health|wearables|account)"/);
 expect(html).toContain('href="/gym"');
});
test.each(['dashboard','members','activity','invite','qr'])('gym subpage %s preserves operational destinations',page=>{
 const html=render(`/gym/123/${page}`);
 for(const route of ['dashboard','members','activity','invite','qr'])expect(html).toContain(`href="/gym/123/${route}"`);
 expect(html).toContain('grid-cols-4');expect(html).not.toContain('grid-cols-5');
});
test('member navigation surfaces the four core actions and keeps supporting pages on desktop',()=>{
 const html=render('/member/dashboard');
 for(const route of ['dashboard','workouts','scan-workout','rewards','nutrition','bookings','health','account'])expect(html).toContain(`href="/member/${route}"`);
 const mobile=html.slice(html.indexOf('<nav data-app-navigation'));
 for(const route of ['dashboard','workouts','scan-workout','rewards'])expect(mobile).toContain(`href="/member/${route}"`);
 expect(mobile).not.toContain('href="/member/nutrition"');expect(mobile).toContain('More');
 expect(html).toContain('grid-cols-5');expect(html).not.toContain('Gym portal navigation');
});
test('privileged workspace switch is hidden for ordinary members',()=>{
 expect(render('/member/dashboard')).not.toContain('Platform Admin');
 const admin=render('/member/dashboard',true);expect(admin).toContain('Switch workspace');expect(admin).toContain('href="/admin/gyms"');
});
test('closed More dialog has no hidden focusable content in the DOM',()=>{expect(render('/member/dashboard')).not.toContain('role="dialog"');});
test.each(['/member/login','/member/signup','/'])('public route %s stays free of sidebar',path=>{
 mockPath=path;const html=renderToStaticMarkup(<MainLayout serverIdentity={{status:"authenticated",userId:"member"}}><div>Public content</div></MainLayout>);expect(html).toContain('Public content');expect(html).not.toContain('<aside');
});
test('protected content waits for server session before it is rendered',()=>{
 mockPath='/member/dashboard';const html=renderToStaticMarkup(<MainLayout serverIdentity={{status:"authenticated",userId:"member"}}><div>Private content</div></MainLayout>);expect(html).not.toContain('Private content');expect(html).toContain('Opening your workspace');
});
