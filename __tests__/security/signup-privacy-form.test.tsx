import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import MemberSignupPage from '@/app/member/signup/page';
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy-policy';

(global as any).React = React;
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/components/BackgroundLayers', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/Logo', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/Reveal', () => ({ __esModule: true, default: ({ children }: any) => <>{children}</> }));

const originalFetch = global.fetch;
let renderer: TestRenderer.ReactTestRenderer;
const field = (name: string) => renderer.root.findByProps({ id: name });
const submit = () => renderer.root.findByType('form').props.onSubmit({ preventDefault: jest.fn() });
const fillForm = () => {
  for (const [name, value] of Object.entries({
    firstName: 'Member', lastName: 'A', email: 'member@example.test', phone: '+971501234567',
    password: 'test-password', confirmPassword: 'test-password',
  })) {
    act(() => field(name).props.onChange({ target: { name, value } }));
  }
};
const accept = (checked = true) => act(() => field('acceptedPrivacyPolicy').props.onChange({ target: { checked } }));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, requiresEmailConfirmation: true }) });
  act(() => { renderer = TestRenderer.create(<MemberSignupPage />); });
});

afterEach(() => {
  act(() => renderer.unmount());
  global.fetch = originalFetch;
});

test('requires an unchecked acknowledgement and opens the policy without leaving signup', () => {
  expect(field('acceptedPrivacyPolicy').props.checked).toBe(false);
  expect(field('acceptedPrivacyPolicy').props.required).toBe(true);
  expect(renderer.root.findByType('button').props.disabled).toBe(true);
});

test('the policy link is public and separate from marketing and wearable authorisation', () => {
  const policy = renderer.root.findAllByType('a').find(link => link.props.href === '/privacy');
  expect(policy?.props.target).toBe('_blank');
  expect(policy?.props.rel).toBe('noopener noreferrer');
  expect(JSON.stringify(renderer.toJSON())).toContain('This does not opt you into marketing or connect wearable accounts.');
});

test('blocks a programmatic submission without agreement and preserves all entered fields', async () => {
  fillForm();
  await act(async () => { await submit(); });
  expect(global.fetch).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({ role: 'alert' }).children.join('')).toContain('Privacy Policy');
  expect(field('email').props.value).toBe('member@example.test');
  expect(field('password').props.value).toBe('test-password');
});

test('submits explicit acceptance and the matching policy version with the existing signup fields', async () => {
  fillForm();
  accept();
  expect(renderer.root.findByType('button').props.disabled).toBe(false);
  await act(async () => { await submit(); });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe('/api/auth/signup');
  expect(JSON.parse(options.body)).toEqual({
    firstName: 'Member', lastName: 'A', email: 'member@example.test', phone: '+971501234567', password: 'test-password',
    acceptedPrivacyPolicy: true, privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('Please check your email to confirm.');
});

test('unchecking consent blocks signup again', async () => {
  fillForm();
  accept();
  accept(false);
  await act(async () => { await submit(); });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a stale policy requires a fresh agreement and leaves the signup details intact', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Refresh this page to read the updated policy.', code: 'privacy_policy_updated' }) });
  fillForm();
  accept();
  await act(async () => { await submit(); });
  expect(field('acceptedPrivacyPolicy').props.checked).toBe(false);
  expect(renderer.root.findByType('button').props.disabled).toBe(true);
  expect(field('email').props.value).toBe('member@example.test');
  expect(renderer.root.findByProps({ role: 'alert' }).children.join('')).toContain('updated policy');
});
