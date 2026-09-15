'use client';

import { useEffect, useState } from 'react';
import { gymReturnPath, isGymLogin, portalLoginUrl } from '@/lib/gym-routing';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Mail, Lock } from 'lucide-react';
import BackgroundLayers from '@/components/BackgroundLayers';
import Logo from '@/components/Logo';
import Reveal from '@/components/Reveal';

export default function MemberLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gymMode, setGymMode] = useState(false);
  const [switchUrl, setSwitchUrl] = useState('/member/login?portal=gym');
  useEffect(() => {
    const mode = isGymLogin(window.location.hostname, new URLSearchParams(window.location.search).get('portal'));
    const target = portalLoginUrl(window.location.hostname, mode);
    if (target.startsWith('https://') && new URL(target).hostname !== window.location.hostname && window.location.hostname !== `www.${new URL(target).hostname}`) {
      window.location.replace(target); return;
    }
    setGymMode(mode);
    setSwitchUrl(portalLoginUrl(window.location.hostname, !mode));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        const params = new URLSearchParams(window.location.search);
        const gym = isGymLogin(window.location.hostname, params.get('portal'));
        window.location.replace(gym ? gymReturnPath(params.get('redirect')) : '/member/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary relative overflow-hidden">
      <BackgroundLayers />

      <main className="relative z-10 min-h-screen flex flex-col">
        <nav className="app-auth-nav px-6 lg:px-10 py-6 flex items-center justify-between">
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
                  {gymMode ? 'Gym portal sign-in' : 'Member access'}
                </span>
                <h1 className="text-balance text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tighter leading-[1.02]">
                  Welcome{' '}
                  <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
                    back
                  </span>
                  .
                </h1>
                <p className="mt-4 text-thrivv-text-secondary text-base lg:text-lg">
                  {gymMode ? 'Your members. Your community. Your gym dashboard.' : "Sign in to keep climbing your gym’s leaderboard."}
                </p>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="relative glass-card overflow-hidden p-7 lg:p-8 shadow-[0_40px_140px_-30px_rgba(216, 189, 125,0.18)]">
                <div
                  className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/50 to-transparent"
                  aria-hidden
                />
                <div
                  className="absolute -top-32 -right-24 w-72 h-72 bg-thrivv-gold-500/12 rounded-full blur-3xl pointer-events-none"
                  aria-hidden
                />

                <form onSubmit={handleSubmit} className="space-y-4 relative">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-thrivv-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="input-premium w-full pl-11 pr-5 py-4 text-base"
                      placeholder="Email address"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-thrivv-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="input-premium w-full pl-11 pr-5 py-4 text-base"
                      placeholder="Password"
                    />
                  </div>

                  {error && (
                    <div className="error-badge px-4 py-3 text-sm">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-4 px-6 disabled:opacity-50 disabled:cursor-not-allowed text-base inline-flex items-center justify-center gap-2 group"
                  >
                    {loading ? (
                      'Signing in...'
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-7 text-center text-sm text-thrivv-text-secondary">
                  <p className="app-gym-switch mb-4">
                    {gymMode ? 'Are you a member? ' : 'Are you a gym owner or manager? '}
                    <a href={switchUrl} className="text-thrivv-gold-500 underline focus-visible:outline">
                      {gymMode ? 'Member login' : 'Gym login'}
                    </a>
                  </p>
                  {gymMode ? 'Need a Thrivv account? ' : "Don't have an account? "}
                  <Link
                    href="/member/signup"
                    className="text-thrivv-gold-500 hover:text-thrivv-gold-400 font-medium transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-8 text-center text-[10px] uppercase tracking-[0.25em] text-thrivv-text-muted">
                {gymMode ? 'Authorised gym access · Powered by Thrivv' : 'Built for gyms · Powered by Thrivv'}
              </p>
            </Reveal>
          </div>
        </div>
      </main>
    </div>
  );
}
