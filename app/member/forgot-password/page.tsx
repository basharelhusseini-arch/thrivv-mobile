'use client';
import { useTranslation } from '@/lib/i18n/client';


import { useRef, useState } from 'react';
import Link from 'next/link';
import PasswordRecoveryShell from '@/components/PasswordRecoveryShell';

export default function ForgotPasswordPage() {
  const { t, locale } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const sending = useRef(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    sending.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to send a reset email. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setError('Unable to connect. Please check your connection and try again.');
    } finally {
      sending.current = false;
      setLoading(false);
    }
  }

  return (
    <PasswordRecoveryShell title={sent ? t("Check your email") : t("Forgot password?")}>
      {sent ? (
        <div className="space-y-5">
          <p role="status" className="text-thrivv-text-secondary">{t("If an account exists for this email, you will receive a password reset link.")}</p>
          <p className="text-sm text-thrivv-text-muted">{t("Check your spam folder if it has not arrived.")}</p>
          <Link href="/member/login" className="btn-primary w-full py-3 px-5 inline-flex justify-center">{t("Back to sign in")}</Link>
          <button type="button" className="text-sm text-thrivv-gold-500 hover:underline" onClick={() => setSent(false)}>{t("Try another email")}</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-thrivv-text-secondary">{t("Enter your account email to receive a password reset link.")}</p>
          <div>
            <label htmlFor="email" className="block text-sm text-thrivv-text-secondary mb-2">{t("Email address")}</label>
            <input id="email" name="email" type="email" dir="ltr" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} autoComplete="email" disabled={loading} className="input-premium w-full px-4 py-3 text-base" />
          </div>
          {error ? <p role="alert" className="error-badge px-4 py-3 text-sm">{t(error)}</p> : null}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 px-5 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? t("Sending...") : t("Send reset link")}
          </button>
        </form>
      )}
    </PasswordRecoveryShell>
  );
}
