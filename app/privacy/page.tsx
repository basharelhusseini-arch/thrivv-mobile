/**
 * Public privacy policy page.
 *
 * Linked from the landing page footer and intended to be the
 * canonical privacy URL submitted to OAuth app reviewers (WHOOP,
 * etc.). The content is intentionally clear and conservative —
 * no overclaiming compliance with any specific regime, no
 * "we sell your data" language, and explicit user controls for
 * disconnect + deletion.
 *
 * Pure server component (no client interactivity needed). Uses
 * the same dark / gold visual language as the rest of the
 * marketing surface but skips the ambient background animation
 * to keep the long-form text easy to read.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Thrivv Technologies collects, uses, and protects your fitness, recovery, and account data — including data from connected wearables such as WHOOP.',
  alternates: { canonical: '/privacy' },
};

const LAST_UPDATED = 'May 2026';
const SUPPORT_EMAIL = 'bashar@thrivv.dev';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 lg:px-10 pt-16 lg:pt-24 pb-24">
        <header className="mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.28em] mb-6">
            Privacy
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tighter leading-[1.04]">
            Privacy Policy
          </h1>
          <p className="mt-5 text-thrivv-text-muted text-sm">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <article className="space-y-12 text-thrivv-text-secondary leading-relaxed text-base">
          <Section title="1. Introduction">
            <p>
              Thrivv Technologies (&ldquo;Thrivv&rdquo;, &ldquo;we&rdquo;,
              &ldquo;us&rdquo;) builds a fitness platform that gyms deploy
              to their members. This Privacy Policy explains what
              information we collect when you use the Thrivv app or
              website (the &ldquo;Service&rdquo;), how we use it, who we
              share it with, and the controls you have over your
              information.
            </p>
            <p>
              By creating a Thrivv account or connecting a wearable
              device to Thrivv, you agree to the practices described
              here. If you do not agree, please do not use the Service.
            </p>
          </Section>

          <Section title="2. Information we collect">
            <p>We collect three broad categories of information.</p>

            <SubHeading>Account information</SubHeading>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Information you provide when you sign up, including your
                name, email address, and a hashed password.
              </li>
              <li>
                Optional profile details such as your gym, membership
                start date, and preferences.
              </li>
            </ul>

            <SubHeading>Activity and check-in information</SubHeading>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Daily check-ins you log in the app, including whether
                you completed a workout, calories, sleep hours, and the
                wellness habits you tracked.
              </li>
              <li>
                Health Score values, streaks, leaderboard standing,
                rewards activity, and similar engagement data generated
                by your use of the Service.
              </li>
              <li>
                Workouts, meal plans, recipes, bookings, and other
                content you create or interact with inside the app.
              </li>
            </ul>

            <SubHeading>Device and technical information</SubHeading>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Basic technical information such as your IP address,
                device type, browser, and timestamps of requests, used
                to operate the Service securely.
              </li>
              <li>
                A signed session cookie used to keep you logged in.
              </li>
            </ul>
          </Section>

          <Section title="3. WHOOP and other wearable data">
            <p>
              If you choose to connect a wearable account such as WHOOP,
              we use that provider&rsquo;s OAuth flow to access a
              limited set of fitness and recovery data on your behalf.
              We currently support WHOOP and may add additional
              providers (for example Apple Health, Garmin) in future
              releases.
            </p>

            <SubHeading>What WHOOP data we access</SubHeading>
            <ul className="list-disc pl-6 space-y-2">
              <li>Recovery score and related cardiovascular metrics, including heart-rate variability (HRV) and resting heart rate.</li>
              <li>Sleep metrics, including sleep performance percentage, sleep efficiency percentage, and total time in bed.</li>
              <li>Daily strain, kilojoules, and basic workout / cycle information.</li>
              <li>Your WHOOP user identifier, used to associate the data with your Thrivv account.</li>
            </ul>

            <SubHeading>How WHOOP credentials are handled</SubHeading>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                WHOOP access and refresh tokens are stored encrypted at
                rest on our database and are never exposed to your
                browser, the Thrivv mobile shell, or any other client.
              </li>
              <li>
                We use the tokens only to fetch the data described
                above, and only for as long as you remain connected to
                WHOOP through Thrivv.
              </li>
              <li>
                Synced WHOOP data is stored in our database as one row
                per day, alongside the raw payload returned by WHOOP for
                that day, so we can recompute your scores if our
                algorithms change.
              </li>
            </ul>

            <SubHeading>Why we use WHOOP data</SubHeading>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                To compute your Thrivv Health Score using objective
                measures (recovery, sleep quality, activity strain) in
                addition to your manual check-ins.
              </li>
              <li>
                To rank you on your gym&rsquo;s weekly leaderboard and
                to award rewards points based on consistency.
              </li>
              <li>
                To display your recent recovery, strain, and sleep on
                the wearables surface inside the app.
              </li>
            </ul>
          </Section>

          <Section title="4. How we use your information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate, and improve the Service.</li>
              <li>Calculate your Health Score, streaks, leaderboard rank, and rewards points.</li>
              <li>Authenticate you, secure your account, and prevent abuse.</li>
              <li>Communicate with you about the Service, including transactional emails and important updates.</li>
              <li>Aggregate usage statistics in non-identifying form to help us understand how the Service is used and to improve it.</li>
            </ul>
            <p>
              We do not sell your personal information to third parties,
              and we do not use your fitness or wearable data to serve
              advertising.
            </p>
          </Section>

          <Section title="5. How we store and protect your data">
            <p>
              Your data is stored on infrastructure operated by our
              hosting and database providers, primarily Supabase
              (PostgreSQL) and Vercel. We rely on industry-standard
              measures including encrypted connections (HTTPS),
              encryption at rest provided by these vendors, hashed
              passwords, and access controls limiting who on our team
              can access production data.
            </p>
            <p>
              Wearable access and refresh tokens are kept server-side
              only and are never returned in any API response or to any
              client device.
            </p>
            <p>
              No system is perfectly secure. While we work hard to
              protect your information, we cannot guarantee absolute
              security and we encourage you to use a strong, unique
              password.
            </p>
          </Section>

          <Section title="6. Data sharing">
            <p>
              We share your information only in the limited
              circumstances described below.
            </p>

            <SubHeading>Your gym</SubHeading>
            <p>
              If you joined Thrivv through a gym, your gym&rsquo;s owner
              and authorised staff may see information needed to operate
              their pilot, including your name, your aggregate activity
              and engagement metrics, and your standing on their gym
              leaderboard. They do not receive your raw wearable
              payloads.
            </p>

            <SubHeading>Service providers</SubHeading>
            <p>
              We use a small number of third-party providers to run the
              Service, including Supabase (database and authentication
              infrastructure) and Vercel (application hosting). These
              providers process data on our behalf under their own
              security and privacy commitments.
            </p>

            <SubHeading>Wearable providers</SubHeading>
            <p>
              When you connect a wearable, the provider (for example
              WHOOP) receives standard OAuth metadata from us as part of
              that connection. We never send your Thrivv password or
              other Thrivv account secrets to wearable providers.
            </p>

            <SubHeading>Legal and safety</SubHeading>
            <p>
              We may disclose information when we believe in good faith
              that disclosure is required by law, necessary to enforce
              our terms, or necessary to protect the rights, property,
              or safety of users or the public.
            </p>

            <SubHeading>What we do not do</SubHeading>
            <p>
              We do not sell your personal information. We do not rent,
              trade, or share your data with advertisers. We do not
              share your raw wearable payloads with anyone other than
              the service providers strictly required to store them.
            </p>
          </Section>

          <Section title="7. Your controls and deletion">
            <p>You are in control of your Thrivv data.</p>

            <SubHeading>Disconnect WHOOP at any time</SubHeading>
            <p>
              You can disconnect your WHOOP account at any time from
              the wearables section of the app. When you disconnect, we
              immediately remove your WHOOP access and refresh tokens
              from your Thrivv account, which prevents any further data
              sync.
            </p>

            <SubHeading>Delete previously synced data</SubHeading>
            <p>
              On request, we will delete the wearable data we have
              stored for your account. To request deletion of WHOOP
              data, your full Thrivv account, or any other personal
              information we hold about you, email us at{' '}
              <a
                className="text-thrivv-gold-500 hover:text-thrivv-gold-400 underline underline-offset-4"
                href={`mailto:${SUPPORT_EMAIL}?subject=Data%20deletion%20request`}
              >
                {SUPPORT_EMAIL}
              </a>{' '}
              from the email address on your account. We aim to action
              deletion requests within 30 days. Some information may be
              retained where we have a legitimate business need (for
              example fraud prevention or financial records), and only
              for as long as that need persists.
            </p>

            <SubHeading>Access and correction</SubHeading>
            <p>
              You can view and update most of your account information
              directly in the app. For anything you cannot change
              yourself, contact us at the address above.
            </p>
          </Section>

          <Section title="8. Cookies and authentication">
            <p>
              Thrivv uses a single signed, HTTP-only session cookie to
              keep you logged in across visits. This cookie does not
              track you across other websites and is not used for
              advertising. We may use a small number of strictly
              necessary cookies for security (for example a temporary
              cookie that protects the wearable OAuth flow against
              cross-site request forgery).
            </p>
            <p>
              We do not use third-party advertising or behavioural
              tracking cookies on the Thrivv site.
            </p>
          </Section>

          <Section title="9. Children's privacy">
            <p>
              Thrivv is not directed to children under 16, and we do not
              knowingly collect personal information from children. If
              you believe a child has provided us with personal
              information, please contact us at{' '}
              <a
                className="text-thrivv-gold-500 hover:text-thrivv-gold-400 underline underline-offset-4"
                href={`mailto:${SUPPORT_EMAIL}`}
              >
                {SUPPORT_EMAIL}
              </a>{' '}
              and we will take appropriate steps to remove that
              information.
            </p>
          </Section>

          <Section title="10. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time as the
              Service evolves or as required by law. When we do, we
              will update the &ldquo;Last updated&rdquo; date at the top
              of the page. Material changes will be communicated to you
              by an in-app notice or by email to the address on your
              account before they take effect.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Questions about this Privacy Policy or about how Thrivv
              handles your information are welcome. You can reach us at:
            </p>
            <p>
              <a
                className="text-thrivv-gold-500 hover:text-thrivv-gold-400 underline underline-offset-4"
                href={`mailto:${SUPPORT_EMAIL}`}
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p>
              Thrivv Technologies. The fitness app your gym deploys.
            </p>
          </Section>
        </article>
      </main>

      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Local layout helpers                                             */
/* ---------------------------------------------------------------- */

function Navbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-thrivv-bg-darker/80 border-b border-thrivv-gold-500/[0.07]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Logo variant="gold" size="md" linkTo="/" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-thrivv-text-secondary hover:text-thrivv-text-primary transition-colors duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-thrivv-gold-500/[0.07] py-10 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
        <Logo variant="gold" size="sm" />
        <p className="text-xs text-thrivv-text-muted text-center">
          © {new Date().getFullYear()} Thrivv Technologies.
        </p>
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/"
            className="text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/member/login"
            className="text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-thrivv-text-primary mb-4">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-[11px] uppercase tracking-[0.28em] text-thrivv-gold-500">
      {children}
    </h3>
  );
}
