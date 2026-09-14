'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Dumbbell,
  Gift,
  Heart,
  QrCode,
  Sparkles,
  Trophy,
  Users,
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
        <RoutineSection />
        <LeaderboardSection />
        <GymSection />
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
            className="px-2 sm:px-4 py-2 text-sm whitespace-nowrap text-thrivv-text-secondary hover:text-thrivv-text-primary transition-colors duration-300"
          >
            Sign In
          </Link>
          <Link
            href="/member/signup"
            className="btn-primary px-3 sm:px-5 py-2 text-sm whitespace-nowrap inline-flex items-center gap-1.5"
          >
            <span className="sm:hidden">Join free</span>
            <span className="hidden sm:inline">Sign Up Free</span>
            <ArrowRight className="hidden sm:block w-3.5 h-3.5" />
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
            Show up.{' '}
            <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
              Make it count
            </span>
            .
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-8 lg:mt-10 max-w-xl text-base sm:text-lg lg:text-xl text-thrivv-text-secondary leading-relaxed">
            Your workouts, daily habits and gym rewards, together. Log your
            training, verify it with your gym&apos;s QR, and track your progress.
            Connect WHOOP for your Health Score and weekly gym ranking, or use
            manual workout check-ins to earn spendable reward points.
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
            Free member account · WHOOP supported · Manual check-ins available
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* How Thrivv Works — membership, activity, verification, progress  */
/* ---------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      icon: Users,
      title: 'Join your gym',
      body: 'Create your account and join with your gym’s invitation link or joining code. Your gym connects you to its member community.',
    },
    {
      n: '02',
      icon: Watch,
      title: 'Train your way',
      body: 'Connect WHOOP and sync your workouts, or log a completed workout manually if you don’t use WHOOP. Record your daily habits along the way.',
    },
    {
      n: '03',
      icon: QrCode,
      title: 'Scan at your gym',
      body: 'Scan the rotating workout QR to verify an eligible workout. WHOOP members sync a finished workout and scan within two hours of finishing.',
    },
    {
      n: '04',
      icon: Activity,
      title: 'See your progress',
      body: 'Follow your activity, Health Score and spendable reward balance in one place. Your reward history shows what was credited and redeemed.',
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
              Your routine.{' '}
              <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
                Connected.
              </span>
            </h2>
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-thrivv-text-secondary max-w-2xl leading-relaxed">
              From joining your gym to recording your next session, each step
              has a clear place in Thrivv.
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
              Training. Recovery.{' '}
              <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
                Habits.
              </span>
            </h2>
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-thrivv-text-secondary leading-relaxed">
              Your daily Health Score combines your best WHOOP workout,
              WHOOP Recovery and completed habits. Up to 80 for training,
              20 for recovery and 10 for habits: a maximum of 110.
            </p>
            <ul className="mt-8 space-y-3 text-sm lg:text-base text-thrivv-text-secondary">
              {[
                'Your best WHOOP workout counts each day; extra workouts do not stack',
                'A complete score needs WHOOP training and recovery data',
                'Complete daily scores contribute to your weekly gym ranking',
                'Health Score and spendable reward points are separate',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-thrivv-neon-green mt-1 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-thrivv-text-secondary">
              Nutrition and manually logged sleep do not add to Health Score.
              Members without WHOOP can track habits and earn the manual
              workout rewards below; a manual check-in does not create WHOOP
              training or recovery points.
            </p>
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

        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <span className="text-[10px] uppercase tracking-[0.28em] text-thrivv-text-muted">
            Health Score · WHOOP example
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-thrivv-neon-green bg-thrivv-neon-green/10 border border-thrivv-neon-green/20 px-2 py-0.5 rounded-md">
            <Zap className="w-3 h-3" />
            Daily score
          </span>
        </div>

        {/* Big circular visualisation — static SVG, no animation */}
        <div className="relative flex flex-col items-center py-4">
          <svg width="220" height="220" viewBox="0 0 220 220" className="block" aria-hidden="true">
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
              strokeDashoffset={`${2 * Math.PI * 92 * (1 - 96 / 110)}`}
              transform="rotate(-90 110 110)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[5.5rem] font-semibold tracking-tighter leading-none text-thrivv-gold-500">
              96
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.28em] text-thrivv-text-muted">
              of 110
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <BreakdownCell
            icon={Dumbbell}
            label="Training"
            value="68"
            outOf="80"
          />
          <BreakdownCell
            icon={Heart}
            label="Recovery"
            value="18"
            outOf="20"
            variant="green"
          />
          <BreakdownCell
            icon={Activity}
            label="Habits"
            value="10"
            outOf="10"
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
    <div className="flex items-center justify-between gap-3 sm:block rounded-xl bg-thrivv-bg-card/60 border border-thrivv-gold-500/10 px-3 py-3">
      <div className="flex items-center gap-1.5 sm:mb-2">
        <Icon className={`w-3.5 h-3.5 ${colour}`} />
        <span className="text-[10px] uppercase tracking-[0.08em] text-thrivv-text-muted">
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
              No WHOOP? Save today&apos;s completed workout, then scan your
              gym&apos;s current workout QR. An eligible verified manual
              workout earns 40 spendable reward points, plus up to 10 for
              qualifying daily habits. Maximum: 50 points per day.
            </p>
            <ul className="mt-8 space-y-3 text-sm lg:text-base text-thrivv-text-secondary">
              {[
                'The 40-point workout award is available once per day',
                'Repeated scans and check-ins never award another 40',
                'Use your balance on available partner offers in Rewards',
                'See point costs, redemption references and fulfillment status',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-thrivv-neon-green mt-1 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-thrivv-gold-500/15 bg-thrivv-gold-500/5 p-4 text-sm leading-relaxed text-thrivv-text-secondary">
              WHOOP-connected members use WHOOP-verified workouts and cannot
              claim manual workout rewards. Spendable points for WHOOP
              workouts are not available yet. Nutrition, sleep and recovery
              add no manual reward points.
            </div>
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
    { icon: QrCode, title: '40 workout points', detail: 'Completed manual workout + valid gym scan' },
    { icon: Heart, title: 'Up to 10 habit points', detail: 'Based on your qualifying habits that day' },
    { icon: Gift, title: 'Spend on available offers', detail: 'Availability and partner terms apply' },
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

        <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
          <span className="text-[10px] uppercase tracking-[0.28em] text-thrivv-text-muted">
            Manual rewards · Daily limit
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-thrivv-gold-500 bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 px-2 py-0.5 rounded-md">
            <Sparkles className="w-3 h-3" />
            Without WHOOP
          </span>
        </div>

        <div className="rounded-2xl bg-thrivv-bg-card/60 border border-thrivv-gold-500/15 p-5 mb-5">
          <div className="text-[10px] uppercase tracking-[0.28em] text-thrivv-text-muted mb-2">
            Maximum daily reward
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl lg:text-6xl font-semibold tracking-tighter leading-none text-thrivv-gold-500 tabular-nums">
              50
            </span>
            <span className="text-thrivv-text-muted text-sm">pts</span>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-thrivv-bg-card overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-thrivv-gold-500 to-thrivv-gold-300"
              style={{ width: '100%' }}
            />
          </div>
          <div className="mt-2 text-[11px] text-thrivv-text-muted">
            40 for your verified workout + up to 10 for habits
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
                <div className="text-sm text-thrivv-text-primary font-medium">
                  {it.title}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-thrivv-text-muted">
                  {it.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoutineSection() {
  const features = [
    { icon: Dumbbell, title: 'Training plans', body: 'Build and save workout plans around your goals, schedule, available equipment and experience. Keep your plans alongside your workout activity.' },
    { icon: UtensilsCrossed, title: 'Nutrition & recipes', body: 'Log meals and portions, track calories and macros, and explore recipes. Nutrition is for tracking: it contributes no Health Score or reward points.' },
    { icon: Heart, title: 'Daily habits', body: 'Record the supported habits you complete in Daily Check-in. Follow your habit progress and see how qualifying habits contribute to your score or eligible manual reward.' },
  ];
  return (
    <section aria-labelledby="routine-heading" className="relative px-6 lg:px-10 py-20 lg:py-28 border-t border-thrivv-gold-500/[0.07]">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.28em] text-thrivv-gold-500 mb-5">Beyond the gym floor</p>
          <h2 id="routine-heading" className="text-balance text-4xl sm:text-5xl font-semibold tracking-tighter">A place for your whole routine.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 80}>
              <div className="glass-card h-full p-6 lg:p-8">
                <feature.icon className="w-6 h-6 text-thrivv-gold-500 mb-6" />
                <h3 className="text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-thrivv-text-secondary">{feature.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
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
              Follow your place among members with complete Health Scores at
              your gym. Your weekly total adds up completed daily scores from
              Monday to Sunday, using your gym&apos;s timezone.
            </p>
            <ul className="mt-8 space-y-3 text-sm lg:text-base text-thrivv-text-secondary">
              {[
                'Up to 110 per completed day and 770 across a full week',
                'See your rank alongside your gym’s weekly totals',
                'Incomplete scores stay pending until the required data is available',
                'Your rank tracks progress; it does not issue reward points',
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
    { rank: 1, name: 'You', score: 480, gold: true },
    { rank: 2, name: 'Alex M.', score: 452 },
    { rank: 3, name: 'Priya R.', score: 430 },
    { rank: 4, name: 'Sami K.', score: 418 },
    { rank: 5, name: 'Jess T.', score: 396 },
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

        <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
          <span className="text-[10px] uppercase tracking-[0.28em] text-thrivv-text-muted inline-flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-thrivv-gold-500" />
            Example gym · Weekly totals
          </span>
          <span className="text-[10px] text-thrivv-gold-500/80 inline-flex items-center gap-1">
            Illustration
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
                    /770
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

function GymSection() {
  const features = [
    { icon: Users, title: 'Welcome your members', body: 'Share a joining code or invitation link. Search your member list and see recent verified workout activity.' },
    { icon: QrCode, title: 'Display your workout QR', body: 'Open a dedicated, automatically rotating QR display for members to scan. Joining codes and workout verification codes have separate roles.' },
    { icon: Activity, title: 'Understand gym activity', body: 'Review accepted workout verifications, unique verified visitors and credited points. Keep member activity and support in the same gym workspace.' },
  ];
  return (
    <section id="gyms" aria-labelledby="gym-heading" className="relative px-6 lg:px-10 py-20 lg:py-28 scroll-mt-20 border-t border-thrivv-gold-500/[0.07]">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.28em] text-thrivv-gold-500 mb-5">For gym teams</p>
          <h2 id="gym-heading" className="text-balance text-4xl sm:text-5xl font-semibold tracking-tighter">Your community. A clearer view.</h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-thrivv-text-secondary">A dedicated portal for your authorized gym team to manage member invitations, display workout QR codes and follow participation.</p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 80}>
              <div className="glass-card h-full p-6 lg:p-8">
                <feature.icon className="w-6 h-6 text-thrivv-gold-500 mb-6" />
                <h3 className="text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-thrivv-text-secondary">{feature.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Final CTA — bold and simple                                      */
/* ---------------------------------------------------------------- */

function FinalCTA() {
  return (
    <section
      className="relative px-6 lg:px-10 py-28 lg:py-44 scroll-mt-20 border-t border-thrivv-gold-500/[0.07]"
    >
      <div className="max-w-5xl mx-auto text-center">
        <Reveal>
          <h2 className="text-balance text-4xl sm:text-6xl lg:text-[5.5rem] xl:text-[6.5rem] font-semibold tracking-tighter leading-[0.94]">
            Your next session.{' '}
            <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
              Your next step
            </span>
            .
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-6 text-base lg:text-xl text-thrivv-text-secondary max-w-xl mx-auto leading-relaxed">
            Create your free account, join your gym and choose the workout
            path that fits you. Your activity, nutrition and rewards are
            ready when you are.
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
              href="/gym"
              className="btn-ghost px-8 py-4 text-base inline-flex items-center justify-center gap-2"
            >
              Open gym portal
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
            href="/gym"
            className="text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors"
          >
            Gym portal &rarr;
          </a>
        </div>
      </div>
    </footer>
  );
}
