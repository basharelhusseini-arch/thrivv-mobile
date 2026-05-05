'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Gift,
  Heart,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  Watch,
  Zap,
} from 'lucide-react';
import Logo from '@/components/Logo';
import Reveal from '@/components/Reveal';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary relative overflow-x-hidden">
      <AmbientBackground />

      <Navbar />

      <main className="relative z-10">
        <Hero />
        <HowItWorks />
        <HealthScoreSection />
        <RewardsSection />
        <LeaderboardSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Background — ambient. Slow gold grid drift + three independently */
/* drifting halos + a soft spotlight pulse behind the hero.         */
/*                                                                  */
/* Every animation operates on transform / opacity /                */
/* background-position only, so the browser composites the          */
/* pre-blurred layers on the GPU without re-rasterising on each     */
/* frame. Honors prefers-reduced-motion (animations disabled) and   */
/* slows on small screens to keep scrolling smooth.                 */
/* ---------------------------------------------------------------- */

function AmbientBackground() {
  return (
    <>
      {/* Faint gold grid — drifts diagonally over 90s.
          Pure background-position animation: no layout, no repaint. */}
      <div
        className="thrivv-grid-drift pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,208,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,208,0,0.6) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 78%)',
        }}
      />

      {/* Three drifting gold auras at staggered durations so they
          never re-align. Blur is applied once via blur-3xl; only
          transform animates, GPU composited. */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="thrivv-aura-a absolute -top-1/4 -left-1/4 w-[55vw] h-[55vw] bg-thrivv-gold-500/[0.10] rounded-full blur-3xl" />
        <div className="thrivv-aura-b absolute top-1/3 -right-1/4 w-[55vw] h-[55vw] bg-thrivv-gold-500/[0.06] rounded-full blur-3xl" />
        <div className="thrivv-aura-c absolute -bottom-1/4 left-1/3 w-[40vw] h-[40vw] bg-thrivv-gold-500/[0.05] rounded-full blur-3xl" />
      </div>

      {/* Soft spotlight behind the hero — gentle opacity breathing. */}
      <div
        className="thrivv-aura-pulse pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 60vw 50vh at 50% 32%, rgba(255,208,0,0.07), transparent 70%)',
        }}
      />

      {/* Top + bottom vignette so the chrome melts into the canvas. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-32 bg-gradient-to-b from-thrivv-bg-darker to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-32 bg-gradient-to-t from-thrivv-bg-darker to-transparent"
        aria-hidden
      />
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Navbar — refined, premium, deliberate                            */
/* ---------------------------------------------------------------- */

function Navbar() {
  const navLinks = [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Health Score', href: '#health-score' },
    { label: 'Rewards', href: '#rewards' },
    { label: 'Leaderboard', href: '#leaderboard' },
    { label: 'Gyms', href: '#gyms' },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-thrivv-bg-darker/75 border-b border-thrivv-gold-500/[0.07]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Logo variant="gold" size="md" linkTo="/" />
          <nav className="hidden lg:flex items-center gap-7" aria-label="Sections">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-thrivv-text-secondary hover:text-thrivv-text-primary transition-colors duration-300"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/member/login"
            className="px-3.5 sm:px-4 py-2 text-sm text-thrivv-text-secondary hover:text-thrivv-text-primary transition-colors duration-300"
          >
            Sign In
          </Link>
          <Link
            href="/member/signup"
            className="btn-primary px-4 sm:px-5 py-2 text-sm inline-flex items-center gap-1.5"
          >
            Sign Up Free
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- */
/* Hero — full viewport, left-aligned, headline-dominant            */
/* ---------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative px-6 lg:px-10 pt-20 lg:pt-32 pb-20 lg:pb-32 min-h-[calc(100vh-4rem)] flex flex-col justify-center">
      <div className="max-w-7xl mx-auto w-full">
        <Reveal>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 text-thrivv-gold-500 text-[11px] uppercase tracking-[0.28em] font-medium">
            <Sparkles className="w-3 h-3" />
            Powered by your gym
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-8 text-balance font-semibold tracking-tighter leading-[0.92] text-[3rem] sm:text-[5.5rem] lg:text-[7.5rem] xl:text-[8.25rem] max-w-[18ch]">
            Train. Track.{' '}
            <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
              Climb the leaderboard
            </span>
            .
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-8 lg:mt-10 max-w-xl text-base sm:text-lg lg:text-xl text-thrivv-text-secondary leading-relaxed">
            Thrivv is the gamified fitness platform your gym gives you. Daily
            check-ins, AI workouts, wearable sync, recipes, and rewards —
            distilled into one Health Score that ranks you on your gym&apos;s
            weekly leaderboard.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 lg:mt-12 flex flex-col sm:flex-row gap-3">
            <Link
              href="/member/signup"
              className="btn-primary px-8 py-4 text-base inline-flex items-center justify-center gap-2 group"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#how-it-works"
              className="btn-ghost px-8 py-4 text-base inline-flex items-center justify-center gap-2"
            >
              See how it works
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <p className="mt-10 text-[11px] uppercase tracking-[0.25em] text-thrivv-text-muted">
            Free for gym members · 30-second daily check-in · Wearable sync
            rolling out
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* How Thrivv Works — 4-step premium feature sequence               */
/* ---------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      icon: Heart,
      title: 'Daily check-in',
      body: 'Log your workout, nutrition, and sleep in under 30 seconds a day. Quick, frictionless, repeatable.',
    },
    {
      n: '02',
      icon: Watch,
      title: 'Wearable sync',
      body: 'Connect Whoop, Apple Health, or Garmin. Training, sleep, and recovery data flow in automatically.',
    },
    {
      n: '03',
      icon: Activity,
      title: 'Health Score',
      body: 'Everything you do is distilled into one 0\u2013100 score. Updated daily. The number that runs your week.',
    },
    {
      n: '04',
      icon: Trophy,
      title: 'Climb the leaderboard',
      body: 'Compete with the members at your gym every week. Top your gym, hold your streak, earn rewards.',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="relative px-6 lg:px-10 py-28 lg:py-44 scroll-mt-20 border-t border-thrivv-gold-500/[0.07]"
    >
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.28em] mb-6">
              How it works
            </span>
            <h2 className="text-balance text-4xl sm:text-5xl lg:text-[4.5rem] xl:text-[5rem] font-semibold tracking-tighter leading-[0.96]">
              Four habits. One score.{' '}
              <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
                Compounds daily.
              </span>
            </h2>
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-thrivv-text-secondary max-w-2xl leading-relaxed">
              No spreadsheets. No second-guessing. Just a feedback loop that
              gets sharper every day you show up.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 lg:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-14 lg:gap-x-10">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="relative">
                <div className="text-6xl lg:text-7xl font-semibold tracking-tighter leading-none text-thrivv-gold-500/80 mb-6">
                  {s.n}
                </div>
                <s.icon className="w-5 h-5 text-thrivv-gold-500 mb-4" />
                <h3 className="text-xl lg:text-2xl font-semibold text-thrivv-text-primary mb-3 tracking-tight">
                  {s.title}
                </h3>
                <p className="text-sm lg:text-base text-thrivv-text-secondary leading-relaxed">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Health Score — flagship feature section, big static visual       */
/* ---------------------------------------------------------------- */

function HealthScoreSection() {
  return (
    <section
      id="health-score"
      className="relative px-6 lg:px-10 py-28 lg:py-44 scroll-mt-20 border-t border-thrivv-gold-500/[0.07]"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        <div className="lg:col-span-6">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.28em] mb-6">
              The Health Score
            </span>
            <h2 className="text-balance text-4xl sm:text-5xl lg:text-[4.5rem] xl:text-[5rem] font-semibold tracking-tighter leading-[0.96]">
              One number.{' '}
              <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
                Total clarity.
              </span>
            </h2>
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-thrivv-text-secondary leading-relaxed">
              Training, nutrition, sleep, and habits — distilled into one
              0&ndash;100 score that updates every day. The number that ranks
              you on your gym&apos;s leaderboard, drives your streak, and tells
              you where to lean in tomorrow.
            </p>
            <ul className="mt-8 space-y-3 text-sm lg:text-base text-thrivv-text-secondary">
              {[
                'A single 0\u2013100 metric instead of a dozen siloed apps',
                'Updated daily from your check-ins and wearable data',
                'Drives your weekly rank, streak, and rewards points',
                'Built around the only thing that actually works: showing up',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-thrivv-neon-green mt-1 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="lg:col-span-6">
          <Reveal delay={120}>
            <HealthScoreVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* Static product visual: the Health Score tile presented as a hero shot. */
function HealthScoreVisual() {
  return (
    <div className="relative">
      <div
        className="absolute -inset-12 bg-thrivv-gold-500/[0.18] blur-3xl rounded-full"
        aria-hidden
      />
      <div className="relative glass-card p-7 lg:p-9 shadow-[0_50px_160px_-40px_rgba(255,208,0,0.28)]">
        <div
          className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/50 to-transparent"
          aria-hidden
        />

        <div className="flex items-center justify-between mb-8">
          <span className="text-[10px] uppercase tracking-[0.28em] text-thrivv-text-muted">
            Health Score · Today
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-thrivv-neon-green bg-thrivv-neon-green/10 border border-thrivv-neon-green/20 px-2 py-0.5 rounded-md">
            <Zap className="w-3 h-3" />
            +4 vs avg
          </span>
        </div>

        {/* Big circular visualisation — static SVG, no animation */}
        <div className="relative flex flex-col items-center py-4">
          <svg width="220" height="220" viewBox="0 0 220 220" className="block">
            <defs>
              <linearGradient id="ring-gold" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#FFD000" />
                <stop offset="100%" stopColor="#FFB800" />
              </linearGradient>
            </defs>
            <circle
              cx="110"
              cy="110"
              r="92"
              stroke="rgba(255,208,0,0.08)"
              strokeWidth="14"
              fill="none"
            />
            <circle
              cx="110"
              cy="110"
              r="92"
              stroke="url(#ring-gold)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 92}`}
              strokeDashoffset={`${2 * Math.PI * 92 * (1 - 0.86)}`}
              transform="rotate(-90 110 110)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[5.5rem] font-semibold tracking-tighter leading-none text-thrivv-gold-500">
              86
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.28em] text-thrivv-text-muted">
              of 100
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <BreakdownCell
            icon={Dumbbell}
            label="Training"
            value="27"
            outOf="30"
          />
          <BreakdownCell
            icon={UtensilsCrossed}
            label="Nutrition"
            value="35"
            outOf="40"
            variant="green"
          />
          <BreakdownCell
            icon={Activity}
            label="Sleep"
            value="24"
            outOf="30"
          />
        </div>
      </div>
    </div>
  );
}

function BreakdownCell({
  icon: Icon,
  label,
  value,
  outOf,
  variant = 'gold',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  outOf: string;
  variant?: 'gold' | 'green';
}) {
  const colour =
    variant === 'green' ? 'text-thrivv-neon-green' : 'text-thrivv-gold-500';
  return (
    <div className="rounded-xl bg-thrivv-bg-card/60 border border-thrivv-gold-500/10 px-3 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${colour}`} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-thrivv-text-muted">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold tracking-tight text-thrivv-text-primary tabular-nums">
          {value}
        </span>
        <span className="text-[10px] text-thrivv-text-muted">/ {outOf}</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Rewards — benefit-led, visual + text                             */
/* ---------------------------------------------------------------- */

function RewardsSection() {
  return (
    <section
      id="rewards"
      className="relative px-6 lg:px-10 py-28 lg:py-44 scroll-mt-20 border-t border-thrivv-gold-500/[0.07]"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        <div className="lg:col-span-6 lg:order-2">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.28em] mb-6">
              Rewards
            </span>
            <h2 className="text-balance text-4xl sm:text-5xl lg:text-[4.5rem] xl:text-[5rem] font-semibold tracking-tighter leading-[0.96]">
              Show up.{' '}
              <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
                Get rewarded.
              </span>
            </h2>
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-thrivv-text-secondary leading-relaxed">
              Every check-in earns points. Every streak compounds them. Redeem
              them for gear, supplements, gym credit, and partner perks. The
              members who put the work in are the ones who get paid back for
              it.
            </p>
            <ul className="mt-8 space-y-3 text-sm lg:text-base text-thrivv-text-secondary">
              {[
                'Points for every check-in, multiplied by streak length',
                'Real rewards: gear, supplements, gym credit, partner perks',
                'No gimmicks \u2014 your gym sees who earned what',
                'Consistency that pays you back, weekly',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-thrivv-neon-green mt-1 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="lg:col-span-6 lg:order-1">
          <Reveal delay={120}>
            <RewardsVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function RewardsVisual() {
  const items = [
    { icon: Trophy, title: 'Weekly winner perk', detail: 'Top your gym 7 days in a row' },
    { icon: Gift, title: 'Gear voucher', detail: 'Redeemable at partner stores' },
    { icon: Flame, title: 'Streak multiplier', detail: '×1.25 points after 14d' },
  ];
  return (
    <div className="relative">
      <div
        className="absolute -inset-12 bg-thrivv-gold-500/[0.16] blur-3xl rounded-full"
        aria-hidden
      />
      <div className="relative glass-card p-7 lg:p-9 shadow-[0_50px_160px_-40px_rgba(255,208,0,0.24)]">
        <div
          className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/50 to-transparent"
          aria-hidden
        />

        <div className="flex items-center justify-between mb-7">
          <span className="text-[10px] uppercase tracking-[0.28em] text-thrivv-text-muted">
            Your rewards · This month
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-thrivv-gold-500 bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 px-2 py-0.5 rounded-md">
            <Sparkles className="w-3 h-3" />
            1,420 pts
          </span>
        </div>

        <div className="rounded-2xl bg-thrivv-bg-card/60 border border-thrivv-gold-500/15 p-5 mb-5">
          <div className="text-[10px] uppercase tracking-[0.28em] text-thrivv-text-muted mb-2">
            Points balance
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl lg:text-6xl font-semibold tracking-tighter leading-none text-thrivv-gold-500 tabular-nums">
              1,420
            </span>
            <span className="text-thrivv-text-muted text-sm">pts</span>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-thrivv-bg-card overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-thrivv-gold-500 to-thrivv-gold-300"
              style={{ width: '71%' }}
            />
          </div>
          <div className="mt-2 text-[11px] text-thrivv-text-muted">
            580 pts to next reward
          </div>
        </div>

        <div className="space-y-2.5">
          {items.map((it) => (
            <div
              key={it.title}
              className="flex items-center gap-3 rounded-xl bg-thrivv-bg-card/40 border border-thrivv-gold-500/10 px-4 py-3"
            >
              <div className="w-9 h-9 rounded-lg bg-thrivv-gold-500/10 border border-thrivv-gold-500/25 flex items-center justify-center shrink-0">
                <it.icon className="w-4 h-4 text-thrivv-gold-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-thrivv-text-primary font-medium truncate">
                  {it.title}
                </div>
                <div className="text-[11px] text-thrivv-text-muted truncate">
                  {it.detail}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-thrivv-text-muted shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Leaderboard — social competition section                         */
/* ---------------------------------------------------------------- */

function LeaderboardSection() {
  return (
    <section
      id="leaderboard"
      className="relative px-6 lg:px-10 py-28 lg:py-44 scroll-mt-20 border-t border-thrivv-gold-500/[0.07]"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        <div className="lg:col-span-6">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.28em] mb-6">
              The Leaderboard
            </span>
            <h2 className="text-balance text-4xl sm:text-5xl lg:text-[4.5rem] xl:text-[5rem] font-semibold tracking-tighter leading-[0.96]">
              Your gym.{' '}
              <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
                Your league.
              </span>
            </h2>
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-thrivv-text-secondary leading-relaxed">
              Compete with the members at your gym every week. The hardest part
              of fitness isn&apos;t knowing what to do &mdash; it&apos;s
              showing up tomorrow. Thrivv hooks consistency to a witness, a
              score, and a reward on the other side.
            </p>
            <ul className="mt-8 space-y-3 text-sm lg:text-base text-thrivv-text-secondary">
              {[
                'Live weekly leaderboards across every member at your gym',
                'Streaks that stack week after week',
                'Climb the table with consistency, not crash diets',
                'Healthy social pressure \u2014 the real motivation engine',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-thrivv-neon-green mt-1 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="lg:col-span-6">
          <Reveal delay={120}>
            <LeaderboardVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function LeaderboardVisual() {
  const board = [
    { rank: 1, name: 'You', score: 86, gold: true, streak: '11d' },
    { rank: 2, name: 'Alex M.', score: 83, streak: '8d' },
    { rank: 3, name: 'Priya R.', score: 81, streak: '14d' },
    { rank: 4, name: 'Sami K.', score: 78, streak: '5d' },
    { rank: 5, name: 'Jess T.', score: 76, streak: '9d' },
  ];
  return (
    <div className="relative">
      <div
        className="absolute -inset-12 bg-thrivv-gold-500/[0.16] blur-3xl rounded-full"
        aria-hidden
      />
      <div className="relative glass-card p-7 lg:p-9 shadow-[0_50px_160px_-40px_rgba(255,208,0,0.24)]">
        <div
          className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/50 to-transparent"
          aria-hidden
        />

        <div className="flex items-center justify-between mb-7">
          <span className="text-[10px] uppercase tracking-[0.28em] text-thrivv-text-muted inline-flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-thrivv-gold-500" />
            Iron Works · this week
          </span>
          <span className="text-[10px] text-thrivv-gold-500/80 inline-flex items-center gap-1">
            <Flame className="w-3 h-3" />
            11d streak
          </span>
        </div>

        <div className="space-y-2">
          {board.map((r) => (
            <div
              key={r.name}
              className={`flex items-center justify-between rounded-xl px-4 py-3.5 border ${
                r.gold
                  ? 'bg-thrivv-gold-500/10 border-thrivv-gold-500/30'
                  : 'bg-thrivv-bg-card/40 border-transparent'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span
                  className={`w-7 text-center text-sm tabular-nums ${
                    r.gold ? 'text-thrivv-gold-500 font-semibold' : 'text-thrivv-text-muted'
                  }`}
                >
                  #{r.rank}
                </span>
                <span
                  className={`text-sm truncate ${
                    r.gold
                      ? 'text-thrivv-gold-500 font-semibold'
                      : 'text-thrivv-text-primary'
                  }`}
                >
                  {r.name}
                </span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-[10px] text-thrivv-text-muted hidden sm:inline-flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  {r.streak}
                </span>
                <span className="inline-flex items-baseline gap-1 tabular-nums">
                  <span
                    className={`text-lg font-semibold ${
                      r.gold
                        ? 'text-thrivv-gold-500'
                        : 'text-thrivv-text-primary'
                    }`}
                  >
                    {r.score}
                  </span>
                  <span className="text-[10px] text-thrivv-text-muted">
                    /100
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Final CTA — bold and simple                                      */
/* ---------------------------------------------------------------- */

function FinalCTA() {
  return (
    <section
      id="gyms"
      className="relative px-6 lg:px-10 py-28 lg:py-44 scroll-mt-20 border-t border-thrivv-gold-500/[0.07]"
    >
      <div className="max-w-5xl mx-auto text-center">
        <Reveal>
          <h2 className="text-balance text-4xl sm:text-6xl lg:text-[5.5rem] xl:text-[6.5rem] font-semibold tracking-tighter leading-[0.94]">
            Ready to{' '}
            <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
              top your gym
            </span>
            ?
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-6 text-base lg:text-xl text-thrivv-text-secondary max-w-xl mx-auto leading-relaxed">
            Sign up free, log your first check-in, and watch your Health Score
            climb the leaderboard.
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/member/signup"
              className="btn-primary px-8 py-4 text-base inline-flex items-center justify-center gap-2 group"
            >
              Sign Up Free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="mailto:bashar@thrivv.dev?subject=Bring%20Thrivv%20to%20my%20gym"
              className="btn-ghost px-8 py-4 text-base inline-flex items-center justify-center gap-2"
            >
              Bring Thrivv to my gym
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-6 text-xs text-thrivv-text-muted">
            Already with us?{' '}
            <Link
              href="/member/login"
              className="text-thrivv-gold-500 hover:text-thrivv-gold-400 transition-colors"
            >
              Sign in &rarr;
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Footer                                                           */
/* ---------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="relative z-10 border-t border-thrivv-gold-500/[0.07] py-10 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
        <Logo variant="gold" size="sm" />
        <p className="text-xs text-thrivv-text-muted text-center">
          © {new Date().getFullYear()} Thrivv Technologies. The fitness app
          your gym deploys.
        </p>
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/member/login"
            className="text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/member/signup"
            className="text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors"
          >
            Sign Up
          </Link>
          <Link
            href="/privacy"
            className="text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors"
          >
            Privacy
          </Link>
          <a
            href="mailto:bashar@thrivv.dev?subject=Run%20Thrivv%20at%20my%20gym"
            className="text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors"
          >
            For gym owners &rarr;
          </a>
        </div>
      </div>
    </footer>
  );
}

