import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GymHeader from '@/app/gym/[gym_id]/dashboard/_components/GymHeader';
import RecentActivityFeed from '@/app/gym/[gym_id]/dashboard/_components/RecentActivityFeed';
import type { GymAnalytics } from '@/app/gym/[gym_id]/dashboard/_components/GymDashboardView';
(global as any).React = React;
test('overview names distinguish Thrivv members, verified activity and awarded points', () => {
  const data={gym:{id:'a',name:'Synthetic Gym'},totals:{total_members:12,active_this_week:3},verified_visitors:{value:2,status:'available'},earned_points:{status:'not_activated',value:null,reason:'Gym-attributed reward earnings are not activated.'},verified_scans:{status:'available',total:7,last_seven_days:3,reason:'Accepted verifications.'}} as GymAnalytics;
  const html=renderToStaticMarkup(<GymHeader data={data} />);
  expect(html).toContain('Members on Thrivv'); expect(html).toContain('Unique verified visitors'); expect(html).toContain('Points awarded'); expect(html).toContain('Verified workouts');
  expect(html).toContain('Unavailable'); expect(html).not.toContain('Gym joining code');
  expect(html).toContain('Spending does not reduce this total');
});
test('recent activity shows check-ins without health details or attendance claims', () => {
  const html=renderToStaticMarkup(<RecentActivityFeed rows={[{id:'c',user_id:'u',name:'Synthetic Member',date:'2026-09-12',created_at:'2026-09-12T12:00:00Z'}]} />);
  expect(html).toContain('Submitted a daily check-in'); expect(html).not.toMatch(/kcal|h sleep|verified attendance/);
});
