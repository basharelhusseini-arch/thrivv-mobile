import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MemberNextAction from '@/components/MemberNextAction';
import { memberNextStep, type VerificationStatus } from '@/lib/member-journey';
import { fixtureVerification } from './fixtures';
(global as any).React = React;
function status(overrides: Partial<VerificationStatus> = {}): VerificationStatus { return { ...fixtureVerification, ...overrides }; }
test('a non-member is directed to gym joining even if a stale workout can scan', () => {
  const step = memberNextStep(status({ gymId: null, manual: { ...fixtureVerification.manual, checkedIn: true, canScan: true } }));
  expect(step.href).toBe('/member/account/join-gym');
});
test('manual members enter the scanner directly while membership restrictions remain', () => {
  expect(memberNextStep(status()).href).toBe('/member/scan-workout');
  expect(memberNextStep(status()).action).toBe('Scan gym QR');
  expect(memberNextStep(status({ manual: { ...fixtureVerification.manual, checkedIn: true, canScan: true } })).href).toBe('/member/scan-workout');
  expect(memberNextStep(status({ manual: { ...fixtureVerification.manual, checkedIn: true, canScan: false } })).href).toBe('/member/account');
});
test('a credited manual workout shows completion and never asks for another scan', () => {
  const completed = status({ creditedPoints: 45, rewardStatus: 'credited', manual: { ...fixtureVerification.manual, checkedIn: true, canScan: true, verified: true } });
  const html = renderToStaticMarkup(<MemberNextAction data={completed} />);
  expect(html).toContain('45 points earned.'); expect(html).toContain('href="/member/rewards"');
  expect(html).not.toContain('href="/member/scan-workout"'); expect(html.match(/<a /g)).toHaveLength(1);
});
test('verified but uncredited workouts never claim the award arrived', () => {
  const step = memberNextStep(status({ rewardStatus: 'retry_pending', manual: { ...fixtureVerification.manual, checkedIn: true, verified: true } }));
  expect(step.title).toBe('Your workout is verified.'); expect(step.title).not.toContain('points earned');
});
test('WHOOP members cannot be routed into manual 40-point check-in by missing workouts', () => {
  const step = memberNextStep(status({ manual: { ...fixtureVerification.manual, eligible: false }, rewardsEnabled: false }));
  expect(step.href).toBe('/member/scan-workout'); expect(step.description).toContain('WHOOP performance'); expect(step.description).not.toContain('40');
});
test('a WHOOP workout scan is verification, without promising reward conversion', () => {
  const step = memberNextStep(status({ manual: { ...fixtureVerification.manual, eligible: false }, rewardsEnabled: false, workouts: [{ id:'w', sport_name:'Strength', start_at:'2026-09-14T10:00:00Z', date:'2026-09-14', canScan:true, verified:false, scanUntil:'2026-09-14T13:00:00Z', status:'Ready for gym verification' }] }));
  expect(step.href).toBe('/member/scan-workout'); expect(step.description).toContain('WHOOP reward conversion is not activated');
  expect(step.action).not.toMatch(/points|reward/i);
});
