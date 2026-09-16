'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PasswordRecoveryShell from '@/components/PasswordRecoveryShell';
import { INVALID_RECOVERY_LINK, parsePasswordRecoveryLink, type PasswordRecoveryLink } from '@/lib/password-recovery-client';

type RecoveryState = 'validating' | 'ready' | 'invalid' | 'validation-error' | 'success';

export default function ResetPasswordPage() {
  const [state, setState] = useState<RecoveryState>('validating');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const recovery = useRef<PasswordRecoveryLink | null>(null);
  const mounted = useRef(false);
  const saveInFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    if (!recovery.current) {
      recovery.current = parsePasswordRecoveryLink(window.location.hash, window.location.search);
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
    const controller = new AbortController();
    const accessToken = recovery.current.accessToken;

    if (!accessToken) {
      setError(recovery.current.error || INVALID_RECOVERY_LINK);
      setState('invalid');
    } else {
      setError('');
      setState('validating');
      void fetch('/api/auth/reset-password/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
        cache: 'no-store',
        signal: controller.signal,
      }).then(async response => {
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (response.ok && data.valid === true) {
          setState('ready');
        } else if (response.status >= 500 || response.status === 429) {
          setError(data.error || 'Unable to verify your reset link. Please try again.');
          setState('validation-error');
        } else {
          recovery.current = { accessToken: null, error: INVALID_RECOVERY_LINK };
          setError(INVALID_RECOVERY_LINK);
          setState('invalid');
        }
      }).catch(() => {
        if (controller.signal.aborted) return;
        setError('Unable to connect. Please check your connection and try again.');
        setState('validation-error');
      });
    }

    return () => {
      mounted.current = false;
      controller.abort();
      // StrictMode immediately re-runs this effect; a real unmount still clears the token.
      queueMicrotask(() => {
        if (!mounted.current) recovery.current = null;
      });
    };
  }, [validationAttempt]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!mounted.current || state !== 'ready' || saveInFlight.current || !recovery.current?.accessToken) return;
    if (password.length < 6 || password.length > 128) {
      setError('Use a password between 6 and 128 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: recovery.current.accessToken, password, confirmPassword }),
        cache: 'no-store',
      });
      const data = await response.json();
      if (!mounted.current) return;
      if (response.ok && data.success === true) {
        recovery.current = null;
        setPassword('');
        setConfirmPassword('');
        setWarning(typeof data.warning === 'string' ? data.warning : '');
        setState('success');
      } else if (response.status === 401 || response.status === 403) {
        recovery.current = null;
        setPassword('');
        setConfirmPassword('');
        setError(INVALID_RECOVERY_LINK);
        setState('invalid');
      } else {
        setError(data.error || 'Unable to reset your password. Please try again.');
      }
    } catch {
      if (mounted.current) setError('Unable to connect. Please check your connection and try again.');
    } finally {
      saveInFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <PasswordRecoveryShell title={state === 'success' ? 'Password updated' : 'Reset password'}>
      {state === 'validating' ? <p role="status" className="text-thrivv-text-secondary">Checking your reset link...</p> : null}
      {state === 'invalid' || state === 'validation-error' ? (
        <div className="space-y-5">
          <p role="alert" className="error-badge px-4 py-3 text-sm">{error}</p>
          {state === 'validation-error' ? (
            <button type="button" onClick={() => setValidationAttempt(attempt => attempt + 1)} className="btn-primary w-full px-5 py-3">Try again</button>
          ) : null}
          <Link href="/member/forgot-password" className="inline-flex justify-center w-full text-thrivv-gold-500 hover:underline">Request a new reset link</Link>
        </div>
      ) : null}
      {state === 'success' ? (
        <div className="space-y-5">
          <p role="status" className="text-thrivv-text-secondary">Your password has been updated. Sign in with your new password.</p>
          {warning ? <p role="alert" className="text-sm text-thrivv-gold-500">{warning}</p> : null}
          <Link href="/member/login" className="btn-primary inline-flex justify-center w-full px-5 py-3">Sign in</Link>
        </div>
      ) : null}
      {state === 'ready' ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm text-thrivv-text-secondary mb-2">New password</label>
            <input id="password" name="password" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} maxLength={128} autoComplete="new-password" disabled={saving} aria-describedby="password-requirements" className="input-premium w-full px-4 py-3 text-base" />
            <p id="password-requirements" className="mt-2 text-sm text-thrivv-text-muted">6 to 128 characters</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm text-thrivv-text-secondary mb-2">Confirm new password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={6} maxLength={128} autoComplete="new-password" disabled={saving} className="input-premium w-full px-4 py-3 text-base" />
          </div>
          {error ? <p role="alert" className="error-badge px-4 py-3 text-sm">{error}</p> : null}
          <button type="submit" disabled={saving} className="btn-primary w-full px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      ) : null}
    </PasswordRecoveryShell>
  );
}
