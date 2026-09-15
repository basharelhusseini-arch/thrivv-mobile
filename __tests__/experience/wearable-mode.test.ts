import { verificationMode } from '@/lib/wearable-mode';
import { isNativeApp } from '@/lib/mobile-app';
import { memberNextStep } from '@/lib/member-journey';
import { fixtureVerification } from './fixtures';

test('a profile preference cannot downgrade a connected member to manual rewards', () => {
  expect(verificationMode(false, { has_wearable: false })).toBe('whoop');
  expect(verificationMode(false, null)).toBe('whoop');
});
test('WHOOP ownership requires connection; unsupported devices use the manual experience', () => {
  expect(verificationMode(true, { has_wearable: true, wearable_type: 'whoop' })).toBe('whoop_setup');
  expect(verificationMode(true, { has_wearable: true, wearable_type: 'apple_watch' })).toBe('manual');
  expect(verificationMode(true, { has_wearable: false })).toBe('manual');
  expect(verificationMode(true, null)).toBe('manual');
});
test('setup routes to Wearables and never falsely claims a connection', () => {
  const step = memberNextStep({ ...fixtureVerification, mode: 'whoop_setup' });
  expect(step.href).toBe('/member/wearables'); expect(step.action).toBe('Connect WHOOP');
});
test('ordinary mobile browsers retain the website entrance', () => {
  expect(isNativeApp('Mozilla/5.0 iPhone Safari/605')).toBe(false);
  expect(isNativeApp('Mozilla/5.0 ThrivvApp/1.0')).toBe(true);
  expect(isNativeApp('NotThrivvApp/1.0')).toBe(false);
  expect(isNativeApp(null)).toBe(false);
});
