import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import ForgotPasswordPage from '@/app/member/forgot-password/page';
import ResetPasswordPage from '@/app/member/reset-password/page';
import MemberLoginPage from '@/app/member/login/page';
import { INVALID_RECOVERY_LINK, parsePasswordRecoveryLink } from '@/lib/password-recovery-client';

(global as any).React = React;
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/components/BackgroundLayers', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/Logo', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/Reveal', () => ({ __esModule: true, default: ({ children }: any) => <>{children}</> }));

const originalFetch = global.fetch;
const originalWindow = (global as any).window;
const recoveryFragment = '#access_token=recovery-token&refresh_token=never-use-this&type=recovery';
let renderer: TestRenderer.ReactTestRenderer | undefined;
const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const field = (id: string) => renderer!.root.findByProps({ id });
const submit = () => renderer!.root.findByType('form').props.onSubmit({ preventDefault: jest.fn() });
const fill = (id: string, value: string) => act(() => field(id).props.onChange({ target: { value } }));
const content = () => JSON.stringify(renderer!.toJSON());

async function render(page: React.ReactElement) {
  await act(async () => { renderer = TestRenderer.create(page); });
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(response({ valid: true }));
  const location = { hash: recoveryFragment, search: '?source=email', pathname: '/member/reset-password', hostname: 'localhost', replace: jest.fn() };
  (global as any).window = {
    location,
    history: {
      state: null,
      replaceState: jest.fn((_state, _title, pathname) => {
        location.hash = '';
        location.search = '';
        location.pathname = pathname;
      }),
    },
    localStorage: { setItem: jest.fn(), getItem: jest.fn() },
    sessionStorage: { setItem: jest.fn(), getItem: jest.fn() },
  };
});

afterEach(async () => {
  await act(async () => { renderer?.unmount(); });
  renderer = undefined;
  jest.restoreAllMocks();
  global.fetch = originalFetch;
  (global as any).window = originalWindow;
});

describe('recovery link parsing', () => {
  test('takes only the access token from an explicitly typed recovery fragment', () => {
    expect(parsePasswordRecoveryLink(recoveryFragment, '')).toEqual({ accessToken: 'recovery-token', error: null });
  });

  test.each([
    ['', ''],
    ['#access_token=test&type=signup', ''],
    ['#access_token=test', ''],
    ['#type=recovery', ''],
    ['#access_token=test&access_token=other&type=recovery', ''],
    ['#access_token=test&type=recovery&type=recovery', ''],
    ['#access_token=with%20spaces&type=recovery', ''],
    ['#error=access_denied&error_code=otp_expired&error_description=Expired', ''],
    [recoveryFragment, '?error_code=otp_expired'],
    ['', '?access_token=test&type=recovery'],
  ])('rejects missing, ambiguous, non-recovery or expired links (%s)', (hash, search) => {
    expect(parsePasswordRecoveryLink(hash, search)).toEqual({ accessToken: null, error: INVALID_RECOVERY_LINK });
  });
});

describe('forgot password', () => {
  test('login exposes the reset-email form without submitting anything', async () => {
    await render(<MemberLoginPage />);
    expect(renderer!.root.findAllByType('a').some(link => link.props.href === '/member/forgot-password')).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('requires user submission, sends only the email, and shows a non-enumerating confirmation', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ success: true }));
    await render(<ForgotPasswordPage />);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(field('email').props.required).toBe(true);
    fill('email', ' member@example.test ');
    await act(async () => { await submit(); });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/auth/forgot-password');
    expect(JSON.parse(options.body)).toEqual({ email: 'member@example.test' });
    expect(content()).toContain('If an account exists for this email, you will receive a password reset link.');
    expect(renderer!.root.findAllByType('form')).toHaveLength(0);
  });

  test('invalid email is blocked even for programmatic submission', async () => {
    await render(<ForgotPasswordPage />);
    fill('email', 'not-an-email');
    await act(async () => { await submit(); });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(content()).toContain('Enter a valid email address.');
  });

  test('prevents duplicate sends and disables the email during the request', async () => {
    let complete!: (value: unknown) => void;
    global.fetch = jest.fn(() => new Promise(resolve => { complete = resolve; })) as any;
    await render(<ForgotPasswordPage />);
    fill('email', 'member@example.test');
    let first!: Promise<void>;
    act(() => { first = submit(); });
    expect(field('email').props.disabled).toBe(true);
    await act(async () => { await submit(); });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await act(async () => { complete(response({ success: true })); await first; });
  });

  test('server errors leave the email available for retry', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ error: 'Too many requests. Try again later.' }, 429));
    await render(<ForgotPasswordPage />);
    fill('email', 'member@example.test');
    await act(async () => { await submit(); });
    expect(field('email').props.value).toBe('member@example.test');
    expect(field('email').props.disabled).toBe(false);
    expect(content()).toContain('Too many requests. Try again later.');
  });
});

describe('reset password', () => {
  test('removes all URL credentials before validating and never persists either token', async () => {
    global.fetch = jest.fn(async () => {
      expect(window.location.hash).toBe('');
      expect(window.location.search).toBe('');
      return response({ valid: true });
    }) as any;
    await render(<ResetPasswordPage />);
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/member/reset-password');
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/auth/reset-password/validate');
    expect(JSON.parse(options.body)).toEqual({ accessToken: 'recovery-token' });
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
    expect(content()).not.toContain('recovery-token');
    expect(content()).not.toContain('never-use-this');
    expect(field('password').props.autoComplete).toBe('new-password');
    expect(field('confirmPassword').props.required).toBe(true);
  });

  test('does not expose password fields before link validation finishes', async () => {
    let complete!: (value: unknown) => void;
    global.fetch = jest.fn(() => new Promise(resolve => { complete = resolve; })) as any;
    await render(<ResetPasswordPage />);
    expect(content()).toContain('Checking your reset link...');
    expect(renderer!.root.findAllByType('input')).toHaveLength(0);
    await act(async () => { complete(response({ valid: true })); });
    expect(renderer!.root.findAllByType('input')).toHaveLength(2);
  });

  test('StrictMode effect replay retains the in-memory token after the fragment was stripped', async () => {
    const realUseEffect = React.useEffect;
    jest.spyOn(React, 'useEffect').mockImplementation((effect, dependencies) => realUseEffect(() => {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanup();
      return effect();
    }, dependencies));
    await render(<ResetPasswordPage />);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls.map(([, options]) => JSON.parse(options.body))).toEqual([
      { accessToken: 'recovery-token' }, { accessToken: 'recovery-token' },
    ]);
    expect(renderer!.root.findAllByType('input')).toHaveLength(2);
    expect(window.history.replaceState).toHaveBeenCalledTimes(1);
  });

  test('missing tokens show a new-link action without sending any request', async () => {
    window.location.hash = '';
    await render(<ResetPasswordPage />);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(content()).toContain(INVALID_RECOVERY_LINK);
    expect(renderer!.root.findAllByType('a').some(link => link.props.href === '/member/forgot-password')).toBe(true);
  });

  test('expired server-validated tokens never expose a password form', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ error: 'Expired' }, 401));
    await render(<ResetPasswordPage />);
    expect(content()).toContain(INVALID_RECOVERY_LINK);
    expect(renderer!.root.findAllByType('form')).toHaveLength(0);
  });

  test('validation network failures allow retry without needing to re-read the stripped fragment', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response({ valid: true }));
    await render(<ResetPasswordPage />);
    expect(content()).toContain('check your connection');
    await act(async () => { renderer!.root.findByType('button').props.onClick(); });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toEqual({ accessToken: 'recovery-token' });
    expect(renderer!.root.findAllByType('input')).toHaveLength(2);
  });

  test.each([
    ['short', 'short', 'between 6 and 128'],
    ['a'.repeat(129), 'a'.repeat(129), 'between 6 and 128'],
    ['valid-password', 'different-password', 'Passwords do not match.'],
    ['valid-password', '', 'Passwords do not match.'],
  ])('blocks invalid password input (%s)', async (password, confirmation, message) => {
    await render(<ResetPasswordPage />);
    fill('password', password);
    fill('confirmPassword', confirmation);
    await act(async () => { await submit(); });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(content()).toContain(message);
  });

  test('submits matching passwords with the token, clears inputs on success and requires sign-in', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response({ valid: true })).mockResolvedValueOnce(response({ success: true }));
    await render(<ResetPasswordPage />);
    fill('password', 'new-test-password');
    fill('confirmPassword', 'new-test-password');
    await act(async () => { await submit(); });
    const [url, options] = (global.fetch as jest.Mock).mock.calls[1];
    expect(url).toBe('/api/auth/reset-password');
    expect(JSON.parse(options.body)).toEqual({ accessToken: 'recovery-token', password: 'new-test-password', confirmPassword: 'new-test-password' });
    expect(content()).toContain('Your password has been updated. Sign in with your new password.');
    expect(renderer!.root.findAllByType('input')).toHaveLength(0);
    expect(window.location.replace).not.toHaveBeenCalled();
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
  });

  test('prevents duplicate reset requests while saving', async () => {
    let complete!: (value: unknown) => void;
    global.fetch = jest.fn().mockResolvedValueOnce(response({ valid: true })).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    await render(<ResetPasswordPage />);
    fill('password', 'new-test-password');
    fill('confirmPassword', 'new-test-password');
    let first!: Promise<void>;
    act(() => { first = submit(); });
    expect(field('password').props.disabled).toBe(true);
    expect(field('confirmPassword').props.disabled).toBe(true);
    await act(async () => { await submit(); });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    await act(async () => { complete(response({ success: true })); await first; });
  });

  test('shows a session-revocation warning without treating a successful password change as a failure', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response({ valid: true })).mockResolvedValueOnce(response({ success: true, warning: 'We could not confirm that all other sessions were signed out.' }));
    await render(<ResetPasswordPage />);
    fill('password', 'new-test-password');
    fill('confirmPassword', 'new-test-password');
    await act(async () => { await submit(); });
    expect(content()).toContain('Your password has been updated.');
    expect(content()).toContain('We could not confirm that all other sessions were signed out.');
    expect(renderer!.root.findAllByType('input')).toHaveLength(0);
  });

  test('an expired token during save clears password fields and requires a new link', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response({ valid: true })).mockResolvedValueOnce(response({ error: 'Expired' }, 401));
    await render(<ResetPasswordPage />);
    fill('password', 'new-test-password');
    fill('confirmPassword', 'new-test-password');
    await act(async () => { await submit(); });
    expect(content()).toContain(INVALID_RECOVERY_LINK);
    expect(renderer!.root.findAllByType('input')).toHaveLength(0);
  });

  test('backend password errors preserve the form so the user can choose a different password', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response({ valid: true })).mockResolvedValueOnce(response({ error: 'Choose a different password.' }, 400));
    await render(<ResetPasswordPage />);
    fill('password', 'new-test-password');
    fill('confirmPassword', 'new-test-password');
    await act(async () => { await submit(); });
    expect(content()).toContain('Choose a different password.');
    expect(field('password').props.disabled).toBe(false);
  });

  test('unmount cancels validation and prevents stale submissions', async () => {
    await render(<ResetPasswordPage />);
    fill('password', 'new-test-password');
    fill('confirmPassword', 'new-test-password');
    const staleSubmit = renderer!.root.findByType('form').props.onSubmit;
    await act(async () => { renderer!.unmount(); });
    expect((global.fetch as jest.Mock).mock.calls[0][1].signal.aborted).toBe(true);
    await staleSubmit({ preventDefault: jest.fn() });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
