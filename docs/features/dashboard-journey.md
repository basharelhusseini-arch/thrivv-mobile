# Thrivv Journey

The Journey card is the first dashboard card, directly below the greeting and above the scan prompt. Its daily boost cycles through 21 original encouragements using the account timezone (device timezone fallback), stays stable during the day, and refreshes on a minute timer or returning to the tab. A circular gold progress dial, star-field backdrop, winding interactive milestone map and perforated reward ticket make progress feel like an adventure. Milestone buttons reveal unlocked status or the remaining visit days without changing earned progress. Reduced-motion settings disable hover movement.

The dashboard now makes verified activity tangible through visit levels, weekly missions and progress toward an eligible reward.

- Spark: 0 verified days; Momentum: 5; Stride: 15; Force: 30; Elite: 60; Legend: 100.
- Level progress measures the interval between the current and next milestone. Spending points never changes levels. The existing activity RPC deduplicates manual and WHOOP verification by date.
- Weekly mission: three verified visit days, plus an optional three days with habits. Uses the existing account-timezone Monday boundary. Missions are recognition only, with no extra points or daily-streak penalties.
- Reward target: cheapest available, unexpired offer from the existing member-scoped catalog, excluding prior non-cancelled redemptions. No offer means an honest empty state, not an invented discount.
- Reuses the dashboard's existing parallel API requests. No migration, extra request, new dependency, or rewards-economy change.
- Native app uses the same web dashboard through its existing WebView.
- Progress bars expose accessible names and values. Animations respect reduced motion. Milestones reflow from six columns to three on narrow screens.

Inspiration: Apple's Activity rings and milestone awards (https://www.apple.com/watch/close-your-rings/), adapted to weekly gym consistency and Thrivv's gold branding.

Verification: `npx jest __tests__/journey --runInBand`, `npx tsc --noEmit`, and lint. Set JOURNEY_PREVIEW=1 on the targeted Jest command to render a static fixture into /tmp for layout inspection with Tailwind CSS. Production build requires Supabase environment variables even for existing unrelated routes; build-only placeholders may be used for compilation, never runtime verification.
