'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Flame,
  Heart,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import Logo from '@/components/Logo';
import BackgroundLayers from '@/components/BackgroundLayers';
import Reveal from '@/components/Reveal';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary relative overflow-x-hidden">
      <BackgroundLayers />

      <Navbar />

      <main className="relative z-10">
        <Hero />
        <StatsStrip />
        <ValueCards />
        <HowItWorks />
        <Differentiation />
        <CitiesMarquee />
        <TrustPillars />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-thrivv-bg-darker/70 border-b border-thrivv-gold-500/[0.08]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Logo variant="gold" size="md" linkTo="/" />
        <nav className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/member/login"
            className="px-3.5 sm:px-4 py-2 text-sm text-thrivv-text-secondary hover:text-thrivv-text-primary transition-colors"
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
        </nav>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative px-6 lg:px-10 pt-20 lg:pt-28 pb-16 lg:pb-24 min-h-[calc(100vh-4rem)] flex flex-col justify-center">
      <div className="max-w-5xl mx-auto text-center w-full">
        <Reveal>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 text-thrivv-gold-500 text-[11px] uppercase tracking-[0.25em] font-medium">
            <Sparkles className="w-3 h-3" />
            Powered by your gym
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-8 text-balance text-[2.85rem] sm:text-7xl lg:text-[6rem] xl:text-[6.75rem] font-semibold tracking-tighter leading-[0.95]">
            Train. Track.{' '}
            <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
              Climb the leaderboard
            </span>
            .
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-7 max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-thrivv-text-secondary leading-relaxed">
            Thrivv is the gamified fitness platform your gym gives you. Daily
            check-ins, AI workouts, wearable sync, recipes, and rewards —
            rolled into one Health Score that ranks you on your gym&apos;s
            weekly leaderboard.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
            <Link
              href="/member/signup"
              className="btn-primary px-8 py-4 text-base inline-flex items-center justify-center gap-2 group"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#features"
              className="btn-ghost px-8 py-4 text-base inline-flex items-center justify-center gap-2"
            >
              See How It Works
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-thrivv-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-thrivv-neon-green" />
              Free for gym members
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-thrivv-neon-green" />
              30-second daily check-in
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-thrivv-neon-green" />
              Wearable sync rolling out
            </span>
          </div>
        </Reveal>
      </div>

      <Reveal delay={420}>
        <div className="mt-20 lg:mt-24 max-w-3xl mx-auto w-full">
          <DashboardMockup />
        </div>
      </Reveal>

      <Reveal delay={540}>
        <div className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-2 text-thrivv-text-muted">
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <ChevronDown className="w-3 h-3 animate-bounce" />
        </div>
      </Reveal>
    </section>
  );
}

function DashboardMockup() {
  // Static cinematic mockup. Pure SVG/HTML — decorative only.
  const board = [
    { rank: 1, name: 'You', score: 86, gold: true },
    { rank: 2, name: 'Alex M.', score: 83 },
    { rank: 3, name: 'Priya R.', score: 81 },
    { rank: 4, name: 'Sami K.', score: 78 },
  ];
  return (
    <div className="relative">
      {/* Ambient halo */}
      <div className="absolute -inset-10 bg-thrivv-gold-500/[0.18] blur-3xl rounded-full" aria-hidden />
      <div className="relative glass-card p-5 lg:p-7 shadow-[0_40px_140px_-30px_rgba(255,208,0,0.25)]">
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/50 to-transparent" />

        {/* Window chrome */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-thrivv-gold-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-thrivv-neon-green/50" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-thrivv-text-muted">
            iron works · today
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-thrivv-neon-green">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-thrivv-neon-green opacity-70 animate-ping" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-thrivv-neon-green" />
            </span>
            Live
          </span>
        </div>

        {/* Hero stat */}
        <div className="rounded-xl bg-thrivv-bg-card/70 border border-thrivv-gold-500/15 p-4 mb-3">
          <div className="text-[10px] uppercase tracking-widest text-thrivv-text-muted mb-2">
            Health Score · Today
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl lg:text-6xl font-semibold text-thrivv-gold-500 leading-none tracking-tighter">
                86
              </span>
              <span className="text-thrivv-text-muted text-sm">/100</span>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] text-thrivv-neon-green bg-thrivv-neon-green/10 border border-thrivv-neon-green/20 px-2 py-0.5 rounded-md">
              <Zap className="w-3 h-3" />
              +4 vs avg
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-thrivv-text-muted">
            <span className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3 text-thrivv-gold-500" /> Train 27/30
            </span>
            <span className="flex items-center gap-1">
              <UtensilsCrossed className="w-3 h-3 text-thrivv-neon-green" /> Diet 35/40
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-thrivv-gold-400" /> Sleep 24/30
            </span>
          </div>
        </div>

        {/* Gym leaderboard */}
        <div className="rounded-xl bg-thrivv-bg-card/70 border border-thrivv-gold-500/15 p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-thrivv-text-muted flex items-center gap-1">
              <Trophy className="w-3 h-3 text-thrivv-gold-500" /> Iron Works · this week
            </span>
            <span className="text-[10px] text-thrivv-gold-500/80 inline-flex items-center gap-1">
              <Flame className="w-3 h-3" /> 11d streak
            </span>
          </div>
          <div className="space-y-1.5">
            {board.map((r) => (
              <div
                key={r.name}
                className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${
                  r.gold
                    ? 'bg-thrivv-gold-500/10 border border-thrivv-gold-500/30'
                    : 'bg-transparent'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-5 text-center text-thrivv-text-muted tabular-nums">
                    #{r.rank}
                  </span>
                  <span
                    className={
                      r.gold
                        ? 'text-thrivv-gold-500 font-medium'
                        : 'text-thrivv-text-primary'
                    }
                  >
                    {r.name}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <span
                    className={
                      r.gold
                        ? 'text-thrivv-gold-500 font-semibold'
                        : 'text-thrivv-text-secondary'
                    }
                  >
                    {r.score}
                  </span>
                  <span className="text-thrivv-text-muted">/100</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini chart */}
        <div className="rounded-xl bg-thrivv-bg-card/70 border border-thrivv-gold-500/15 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-thrivv-text-muted">
              Health Score · 14d
            </span>
            <span className="text-[10px] text-thrivv-neon-green inline-flex items-center gap-1">
              <Zap className="w-3 h-3" /> trending up
            </span>
          </div>
          <svg viewBox="0 0 280 56" className="w-full h-14" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lp-gold" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#FFD000" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#FFD000" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 40 L 20 36 L 40 38 L 60 30 L 80 32 L 100 24 L 120 28 L 140 20 L 160 22 L 180 14 L 200 18 L 220 10 L 240 14 L 260 8 L 280 12 L 280 56 L 0 56 Z"
              fill="url(#lp-gold)"
            />
            <path
              d="M 0 40 L 20 36 L 40 38 L 60 30 L 80 32 L 100 24 L 120 28 L 140 20 L 160 22 L 180 14 L 200 18 L 220 10 L 240 14 L 260 8 L 280 12"
              fill="none"
              stroke="#FFD000"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function StatsStrip() {
  const stats = [
    { value: '0\u2013100', label: 'Health Score' },
    { value: '30s', label: 'Daily check-in' },
    { value: 'Weekly', label: 'Gym leaderboard' },
    { value: 'Free', label: 'For members' },
  ];
  return (
    <section className="relative border-t border-b border-thrivv-gold-500/10 px-6 lg:px-10 py-16 lg:py-20">
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 100}>
            <div className="text-center lg:text-left">
              <div className="text-5xl sm:text-6xl lg:text-[4.5rem] font-semibold tracking-tighter leading-none text-thrivv-text-primary">
                {s.value}
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-thrivv-text-muted">
                {s.label}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function ValueCards() {
  const cards: Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
    badge?: string;
  }> = [
    {
      icon: Activity,
      title: 'Health Score',
      body: 'Training, nutrition, sleep, and habits distilled into one 0\u2013100 score. The number that ranks you on your gym\u2019s leaderboard.',
    },
    {
      icon: Trophy,
      title: 'Gym Leaderboard',
      body: 'Compete with the members at your gym every week. Streaks, weekly ranks, and bragging rights turn training into a game.',
    },
    {
      icon: Dumbbell,
      title: 'AI Workout Generator',
      body: 'Personalised programs that adapt to your goals, equipment, recovery, and last session \u2014 generated by AI, refined by your data.',
    },
    {
      icon: UtensilsCrossed,
      title: 'Recipes & Nutrition',
      body: 'Macro-balanced meal plans and a curated recipe library tuned to your body, your preferences, and how you like to eat.',
    },
    {
      icon: Heart,
      title: 'Wearable Sync',
      body: 'Pull workouts, sleep, and recovery from Whoop, Apple Health, and Garmin so your training data flows in automatically.',
      badge: 'Rolling out',
    },
    {
      icon: Sparkles,
      title: 'Rewards Marketplace',
      body: 'Earn points for showing up. Redeem them for gear, supplements, and gym perks. Consistency that pays you back.',
    },
  ];

  return (
    <section
      id="features"
      className="relative px-6 lg:px-10 py-24 lg:py-36 scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <SectionHeader
            eyebrow="What you get"
            title={
              <>
                Everything your training needs,{' '}
                <span className="text-gradient">in one app</span>
                .
              </>
            }
            sub={
              'Most fitness apps solve one problem. Thrivv connects training, nutrition, recovery, rewards, and your gym\u2019s leaderboard into one feedback loop.'
            }
          />
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-16 lg:mt-20">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={(i % 3) * 100}>
              <div className="group relative h-full rounded-2xl bg-thrivv-bg-card border border-thrivv-gold-500/10 p-7 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-thrivv-gold-500/30 hover:scale-[1.005] hover:shadow-[0_20px_60px_-20px_rgba(255,208,0,0.18)] overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-thrivv-gold-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="flex items-center justify-between mb-5">
                  <div className="icon-badge inline-flex w-12 h-12 items-center justify-center transition-transform duration-500 group-hover:scale-105">
                    <c.icon className="w-5 h-5 text-thrivv-gold-500" />
                  </div>
                  {c.badge ? (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-thrivv-gold-500 bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 px-2 py-1 rounded-md">
                      {c.badge}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-lg font-semibold text-thrivv-text-primary mb-2">
                  {c.title}
                </h3>
                <p className="text-sm text-thrivv-text-secondary leading-relaxed">
                  {c.body}
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

function HowItWorks() {
  const steps = [
    {
      icon: Heart,
      label: 'Step 01',
      title: 'Log your daily check-in',
      body: 'Workout, nutrition, sleep, and habits \u2014 all in under 30 seconds a day. Sync your wearable to fill in the rest.',
    },
    {
      icon: LineChart,
      label: 'Step 02',
      title: 'Get your Health Score',
      body: 'A single number from 0\u2013100 that captures how today actually went \u2014 and feeds your weekly leaderboard rank.',
    },
    {
      icon: Trophy,
      label: 'Step 03',
      title: 'Climb your gym\u2019s leaderboard',
      body: 'Top your gym every week. Earn rewards points for streaks, redeem them for gear, supplements, and gym perks.',
    },
  ];

  return (
    <section className="relative px-6 lg:px-10 py-24 lg:py-36">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <SectionHeader
            eyebrow="How Thrivv works"
            title={
              <>
                Three simple steps.{' '}
                <span className="text-gradient">A system that compounds.</span>
              </>
            }
            sub="No spreadsheets. No second-guessing. Just a feedback loop that gets sharper every day you show up — and a leaderboard that keeps you honest."
          />
        </Reveal>

        <div className="relative mt-16 lg:mt-20">
          <div
            aria-hidden
            className="hidden lg:block absolute top-[60px] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/30 to-transparent"
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="glass-card p-7 h-full hover:border-thrivv-gold-500/30 transition-colors duration-500">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-thrivv-gold-500 text-black font-semibold flex items-center justify-center text-sm tracking-wider glow-gold">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-thrivv-text-muted">
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <s.icon className="w-5 h-5 text-thrivv-gold-500" />
                    <h3 className="text-xl font-semibold text-thrivv-text-primary">
                      {s.title}
                    </h3>
                  </div>
                  <p className="text-sm text-thrivv-text-secondary leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function Differentiation() {
  const rows: Array<{ label: string; them: string | boolean; us: boolean }> = [
    { label: 'Personalised AI training plans', them: 'Sometimes', us: true },
    { label: 'Recipes & nutrition planning', them: 'Sometimes', us: true },
    { label: 'Sleep & recovery factored in', them: false, us: true },
    { label: 'A single connected Health Score', them: false, us: true },
    { label: 'Wearable sync (Whoop / Apple Health / Garmin)', them: 'Partial', us: true },
    { label: 'Gym leaderboard built in', them: false, us: true },
    { label: 'Rewards marketplace', them: false, us: true },
    { label: 'Deployed by your gym', them: false, us: true },
  ];

  return (
    <section className="relative px-6 lg:px-10 py-24 lg:py-36">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <SectionHeader
            eyebrow="Why Thrivv is different"
            title={
              <>
                Not just workouts. Not just calories.{' '}
                <span className="text-gradient">One connected system.</span>
              </>
            }
            sub={
              'Most apps optimise for a single metric. Thrivv treats training, diet, sleep, wearable data, and your gym\u2019s leaderboard as one feedback loop \u2014 because that\u2019s how the body and motivation actually work.'
            }
          />
        </Reveal>

        <div className="mt-16 lg:mt-20 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Reveal className="lg:col-span-2">
            <div className="rounded-2xl bg-thrivv-bg-card border border-thrivv-gold-500/10 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] items-center px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-thrivv-text-muted">
                <span>Capability</span>
                <span className="px-4">Most apps</span>
                <span className="px-4 text-thrivv-gold-500">Thrivv</span>
              </div>
              <div className="border-t border-thrivv-gold-500/10" />
              <ul>
                {rows.map((r, i) => (
                  <li
                    key={r.label}
                    className={`grid grid-cols-[1fr_auto_auto] items-center px-6 py-5 text-sm transition-colors hover:bg-thrivv-gold-500/[0.02] ${
                      i < rows.length - 1
                        ? 'border-b border-thrivv-gold-500/10'
                        : ''
                    }`}
                  >
                    <span className="text-thrivv-text-primary">{r.label}</span>
                    <span className="px-4 text-thrivv-text-muted text-xs">
                      {r.them === true ? (
                        <Check className="w-4 h-4" />
                      ) : r.them === false ? (
                        <span className="text-thrivv-text-muted/60">—</span>
                      ) : (
                        r.them
                      )}
                    </span>
                    <span className="px-4 text-thrivv-gold-500">
                      <Check className="w-4 h-4" />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-2xl bg-thrivv-bg-card border border-thrivv-gold-500/10 p-7 flex flex-col h-full">
              <div className="icon-badge inline-flex w-12 h-12 items-center justify-center mb-5">
                <Target className="w-5 h-5 text-thrivv-gold-500" />
              </div>
              <h3 className="text-xl font-semibold text-thrivv-text-primary mb-3">
                Built around the only thing that actually works: showing up.
              </h3>
              <p className="text-sm text-thrivv-text-secondary leading-relaxed mb-6">
                The hardest part of fitness isn&apos;t knowing what to do — it&apos;s
                showing up tomorrow. Thrivv hooks into your gym&apos;s
                leaderboard so consistency has a witness, a score, and a reward
                on the other side.
              </p>
              <div className="mt-auto space-y-2.5">
                {[
                  'Daily check-ins under 30 seconds',
                  'Health Score you can compare to yesterday',
                  'Live gym leaderboard updated weekly',
                  'Streaks and rewards points for showing up',
                  'Wearable data filling in automatically',
                ].map((line) => (
                  <div
                    key={line}
                    className="flex items-start gap-2.5 text-sm text-thrivv-text-secondary"
                  >
                    <Check className="w-4 h-4 text-thrivv-neon-green mt-0.5 shrink-0" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function CitiesMarquee() {
  const cities = [
    'DUBAI',
    'SHARJAH',
    'COVENTRY',
    'LEAMINGTON',
    'LUANDA',
    'ABU DHABI',
  ];
  // Duplicated content makes the -50% translate loop seamless.
  const items = [...cities, ...cities, ...cities, ...cities];

  return (
    <section className="relative border-t border-b border-thrivv-gold-500/10 py-14 lg:py-16 overflow-hidden">
      {/* Edge fades so cities glide in/out of view rather than popping */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-32 z-10 bg-gradient-to-r from-thrivv-bg-darker to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-32 z-10 bg-gradient-to-l from-thrivv-bg-darker to-transparent"
        aria-hidden
      />

      <Reveal>
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.25em]">
            Where we&apos;re going
          </span>
        </div>
      </Reveal>

      <div className="marquee-track flex gap-12 lg:gap-16 whitespace-nowrap items-center w-[200%]">
        {items.map((c, i) => (
          <span
            key={`${c}-${i}`}
            className="inline-flex items-center gap-12 lg:gap-16 text-2xl lg:text-3xl xl:text-4xl font-medium tracking-[0.2em] text-thrivv-text-muted"
          >
            {c}
            <span className="text-thrivv-gold-500/40">·</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function TrustPillars() {
  const pillars = [
    {
      icon: ShieldCheck,
      label: 'Built for consistency',
      body: 'Designed around the one habit that beats every program: showing up.',
    },
    {
      icon: Brain,
      label: 'AI-guided planning',
      body: 'Workouts and meals that adjust to your data — not generic templates.',
    },
    {
      icon: Activity,
      label: 'Wearable + self-logged',
      body: 'Whoop, Apple Health, Garmin syncing alongside your daily check-ins.',
    },
    {
      icon: Trophy,
      label: 'Your gym, your league',
      body: 'Live weekly leaderboards across every member at your gym.',
    },
  ];

  return (
    <section className="relative px-6 lg:px-10 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((p, i) => (
            <Reveal key={p.label} delay={i * 80}>
              <div className="glass-card p-5 h-full hover:border-thrivv-gold-500/30 transition-colors duration-500">
                <p.icon className="w-5 h-5 text-thrivv-gold-500 mb-3" />
                <div className="text-sm font-medium text-thrivv-text-primary mb-1">
                  {p.label}
                </div>
                <div className="text-xs text-thrivv-text-muted leading-relaxed">
                  {p.body}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function FinalCTA() {
  return (
    <section className="relative px-6 lg:px-10 py-24 lg:py-36">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="relative rounded-3xl bg-thrivv-bg-card border border-thrivv-gold-500/10 overflow-hidden p-10 lg:p-16 text-center">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[70%] h-72 bg-thrivv-gold-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/50 to-transparent" />

            <Sparkles className="w-7 h-7 text-thrivv-gold-500 mx-auto mb-5" />
            <h2 className="text-balance text-4xl sm:text-5xl lg:text-[4.5rem] font-semibold tracking-tighter leading-[1.02]">
              Ready to{' '}
              <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
                top your gym
              </span>
              ?
            </h2>
            <p className="mt-5 text-thrivv-text-secondary text-base lg:text-lg max-w-xl mx-auto">
              Sign up free, log your first check-in, and watch your Health
              Score climb the leaderboard. If your gym isn&apos;t on Thrivv
              yet, send them our way.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
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
                Ask your gym for Thrivv
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
            <div className="mt-5 text-xs text-thrivv-text-muted">
              Already with us?{' '}
              <Link
                href="/member/login"
                className="text-thrivv-gold-500 hover:text-thrivv-gold-400 transition-colors"
              >
                Sign in →
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="relative z-10 border-t border-thrivv-gold-500/10 py-10 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo variant="gold" size="sm" />
        <p className="text-xs text-thrivv-text-muted text-center">
          © {new Date().getFullYear()} Thrivv. The fitness app your gym
          deploys.
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
          <a
            href="mailto:bashar@thrivv.dev?subject=Run%20Thrivv%20at%20my%20gym"
            className="text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors"
          >
            For gym owners →
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------------- */

function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.25em] mb-5">
        {eyebrow}
      </span>
      <h2 className="text-balance text-3xl sm:text-5xl lg:text-[3.75rem] font-semibold tracking-tighter leading-[1.02] mb-5">
        {title}
      </h2>
      <p className="text-thrivv-text-secondary text-base sm:text-lg leading-relaxed">
        {sub}
      </p>
    </div>
  );
}
