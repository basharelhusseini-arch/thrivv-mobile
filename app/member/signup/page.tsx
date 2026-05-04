'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Mail, Lock, User, Phone } from 'lucide-react';
import BackgroundLayers from '@/components/BackgroundLayers';
import Logo from '@/components/Logo';
import Reveal from '@/components/Reveal';

export default function MemberSignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.requiresEmailConfirmation) {
          setSuccess(
            data.message || 'Account created! Please check your email to confirm.'
          );
        } else {
          if (data.user) {
            localStorage.setItem('memberId', data.user.id);
            localStorage.setItem(
              'memberName',
              `${data.user.firstName} ${data.user.lastName}`
            );
            localStorage.setItem('memberEmail', data.user.email);
          }
          setSuccess('Account created successfully! Redirecting...');
          setTimeout(() => router.push('/member/dashboard'), 1500);
        }
      } else {
        const errorMessage = data.error || 'Registration failed';
        const errorDetails = data.details ? ` (${data.details})` : '';
        setError(errorMessage + errorDetails);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Network error. Please check your connection and try again.';
      console.error('Signup request failed:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary relative overflow-hidden">
      <BackgroundLayers />

      <main className="relative z-10 min-h-screen flex flex-col">
        <nav className="px-6 lg:px-10 py-6 flex items-center justify-between">
          <Logo variant="gold" size="md" linkTo="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>
        </nav>

        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-16">
          <div className="w-full max-w-md">
            <Reveal>
              <div className="text-center mb-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.28em] mb-6">
                  Get started
                </span>
                <h1 className="text-balance text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tighter leading-[1.02]">
                  Start your{' '}
                  <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
                    journey
                  </span>
                  .
                </h1>
                <p className="mt-4 text-thrivv-text-secondary text-base lg:text-lg">
                  Create your account, log your first check-in, and climb your
                  gym&apos;s leaderboard.
                </p>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="relative glass-card overflow-hidden p-7 lg:p-8 shadow-[0_40px_140px_-30px_rgba(255,208,0,0.18)]">
                <div
                  className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/50 to-transparent"
                  aria-hidden
                />
                <div
                  className="absolute -top-32 -right-24 w-72 h-72 bg-thrivv-gold-500/12 rounded-full blur-3xl pointer-events-none"
                  aria-hidden
                />

                <form onSubmit={handleSubmit} className="space-y-4 relative">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <User className="w-4 h-4 text-thrivv-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        autoComplete="given-name"
                        className="input-premium w-full pl-11 pr-4 py-4 text-base"
                        placeholder="First name"
                      />
                    </div>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      autoComplete="family-name"
                      className="input-premium w-full px-4 py-4 text-base"
                      placeholder="Last name"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="w-4 h-4 text-thrivv-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      className="input-premium w-full pl-11 pr-5 py-4 text-base"
                      placeholder="Email address"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-4 h-4 text-thrivv-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      autoComplete="tel"
                      className="input-premium w-full pl-11 pr-5 py-4 text-base"
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-thrivv-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      minLength={6}
                      className="input-premium w-full pl-11 pr-5 py-4 text-base"
                      placeholder="Password (6+ characters)"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-thrivv-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      className="input-premium w-full pl-11 pr-5 py-4 text-base"
                      placeholder="Confirm password"
                    />
                  </div>

                  {error && (
                    <div className="error-badge px-4 py-3 text-sm">{error}</div>
                  )}

                  {success && (
                    <div className="success-badge px-4 py-3 text-sm">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-4 px-6 disabled:opacity-50 disabled:cursor-not-allowed text-base inline-flex items-center justify-center gap-2 group"
                  >
                    {loading ? (
                      'Creating account...'
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-7 text-center text-sm text-thrivv-text-secondary">
                  Already have an account?{' '}
                  <Link
                    href="/member/login"
                    className="text-thrivv-gold-500 hover:text-thrivv-gold-400 font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-8 text-center text-[10px] uppercase tracking-[0.25em] text-thrivv-text-muted">
                Free for gym members · No credit card
              </p>
            </Reveal>
          </div>
        </div>
      </main>
    </div>
  );
}
