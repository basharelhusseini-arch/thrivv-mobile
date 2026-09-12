import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GymHeader from '@/app/gym/[gym_id]/dashboard/_components/GymHeader';
import RecentActivityFeed from '@/app/gym/[gym_id]/dashboard/_components/RecentActivityFeed';
import type { GymAnalytics } from '@/app/gym/[gym_id]/dashboard/_components/GymDashboardView';
(global as any).React = React;
test('header renders gym, joining-code section and four truthful metrics', () => {
  const data={gym:{id:'a',name:'Synthetic Gym'},totals:{total_members:12,active_this_week:3},earned_points:{status:'not_activated',value:null,reason:'Gym-attributed reward earnings are not activated.'},verified_scans:{status:'not_activated',total:null,last_seven_days:null,reason:'Workout QR verification is not activated.'}} as GymAnalytics;
  const html=renderToStaticMarkup(<GymHeader data={data} />);
  expect(html.indexOf('Synthetic Gym')).toBeLessThan(html.indexOf('Gym joining code'));
  expect(html).toContain('Total members'); expect(html).toContain('Active members'); expect(html).toContain('Points accumulated'); expect(html).toContain('Verified scans');
  expect(html.match(/>Not activated</g)).toHaveLength(2);
  expect(html).toContain('This is not a workout-verification QR code');
  expect(html).toContain('sm:grid-cols-2'); expect(html).toContain('xl:grid-cols-4');
});
test('recent activity shows check-ins without health details or attendance claims', () => {
  const html=renderToStaticMarkup(<RecentActivityFeed rows={[{id:'c',user_id:'u',name:'Synthetic Member',date:'2026-09-12',created_at:'2026-09-12T12:00:00Z'}]} />);
  expect(html).toContain('Submitted a daily check-in'); expect(html).not.toMatch(/kcal|h sleep|verified attendance/);
});
