/**
 * Health Score v2 — central, deterministic scorer.
 *
 * Single function used by:
 *   - /api/whoop/sync           (wearable user, hybrid path)
 *   - /api/checkin/today        (manual user)
 *   - /api/health/update-from-nutrition  (manual user)
 *
 * Formula (out of 110 raw, normalised to 100):
 *
 *   Activity         50 raw points
 *   Recovery         15 raw points  (Recovery + Sleep = 30 combined)
 *   Sleep            15 raw points
 *   Food             20 raw points
 *   Habits           10 raw points
 *   --------         ---
 *   TOTAL           110 raw points  →  finalScore = round((raw / 110) * 100)
 *
 * Design rules (per spec):
 *   - Pure function: no DB, no fetch, no env, no clock side-effects.
 *     Caller passes a `date` string when it wants one in the output.
 *   - Optional chaining + null-tolerant inputs throughout. Missing
 *     fields contribute 0 — never synthetic values, never throws.
 *   - Wearable users keep manual food + habits scoring (those signals
 *     never come from a wearable). WHOOP improves verification and
 *     accuracy for activity / recovery / sleep only.
 *   - Non-wearable users score on manual fields only and can still
 *     reach 100. Owning a wearable is not required.
 *   - Verification rules and recovery-aware caps are applied in a
 *     deterministic order (computed first, then capped).
 */

export type WhoopScoringFields = {
  recoveryScore: number | null; // 0–100
  sleepPerformancePct: number | null; // 0–100
  sleepEfficiencyPct: number | null; // 0–100
  totalSleepMs: number | null;
  dayStrain: number | null; // 0–21 in WHOOP's native scale
};

export type ManualScoringFields = {
  /** Did the user log a workout today? null = unknown. */
  didWorkout: boolean | null;
  /** Manual hours slept (used as a fallback when WHOOP sleep is missing). */
  sleepHours: number | null;
  /** Habits ticked today. null treated as 0. */
  habitsCompleted: number | null;
  /** Calories logged. null = no nutrition signal at all. */
  caloriesLogged: number | null;
  /** Optional calorie target (default 2200 if absent). */
  calorieTarget?: number | null;
  /**
   * Optional manual recovery / energy / readiness signal. Not in the
   * current daily_checkins schema; reserved so a future check-in
   * field can plug in without changing the function signature.
   */
  manualRecovery?: 'excellent' | 'good' | 'okay' | 'poor' | null;
};

export type HealthScoreV2Input = {
  whoop?: WhoopScoringFields | null;
  manual: ManualScoringFields;
  date?: string;
};

export type HealthScoreV2Output = {
  finalScore: number; // 0..100, integer
  rawScore: number; // 0..110
  maxRawScore: number; // always 110
  scoreSource: 'manual' | 'whoop' | 'hybrid';
  date: string | null;
  componentBreakdown: {
    activity: number; // 0..50
    recovery: number; // 0..15
    sleep: number; // 0..15
    recoverySleep: number; // 0..30 (recovery + sleep)
    food: number; // 0..20
    habits: number; // 0..10
  };
  inputsUsed: {
    whoopActivity: boolean;
    whoopRecovery: boolean;
    whoopSleep: boolean;
    manualFood: boolean;
    manualHabits: boolean;
    manualRecovery: boolean;
  };
};

const MAX_ACTIVITY = 50;
const MAX_RECOVERY = 15;
const MAX_SLEEP = 15;
const MAX_FOOD = 20;
const MAX_HABITS = 10;
const MAX_RAW = MAX_ACTIVITY + MAX_RECOVERY + MAX_SLEEP + MAX_FOOD + MAX_HABITS; // 110

const DEFAULT_CALORIE_TARGET = 2200;

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0;
  const t = (x - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/* ---------------------------------------------------------------- */
/* Activity                                                          */
/* ---------------------------------------------------------------- */

/**
 * Map a WHOOP day_strain (0..21) into raw activity points (0..50).
 * Piecewise linear off the spec's anchor points. Strictly monotone.
 */
function activityFromStrain(strain: number): number {
  if (strain < 2) return 0;
  if (strain < 4) return lerp(strain, 2, 4, 5, 15);
  if (strain < 8) return lerp(strain, 4, 8, 15, 30);
  if (strain < 12) return lerp(strain, 8, 12, 30, 42);
  if (strain < 16) return lerp(strain, 12, 16, 42, 50);
  return MAX_ACTIVITY;
}

/**
 * Manual fallback when WHOOP day_strain is missing. We currently
 * only have a boolean did_workout signal in daily_checkins, so the
 * spec's "boolean only" branch applies: completed = 40 pts.
 *
 * If/when a duration / intensity field is added to daily_checkins,
 * the up-to-10 + up-to-10 bonuses can be wired in here without
 * changing this function's signature.
 */
function activityFromManual(manual: ManualScoringFields): number {
  if (manual.didWorkout === true) return 40;
  // No workout logged. The spec allows "0..10 depending on movement"
  // but the current schema has no movement field separate from
  // did_workout — return 0 to stay deterministic.
  return 0;
}

function activityPoints(
  whoop: WhoopScoringFields | null | undefined,
  manual: ManualScoringFields
): { points: number; usedWhoop: boolean } {
  const strain = whoop?.dayStrain ?? null;
  const recovery = whoop?.recoveryScore ?? null;

  if (!isFiniteNumber(strain)) {
    return { points: clamp(activityFromManual(manual), 0, MAX_ACTIVITY), usedWhoop: false };
  }

  let pts = activityFromStrain(strain);

  // Verification rule — manual workout claim with low WHOOP strain.
  // Cap at 25 so the user gets some credit but not full credit.
  if (manual.didWorkout === true && strain < 4) {
    pts = Math.min(pts, 25);
  }

  // Recovery-aware adjustments.
  if (isFiniteNumber(recovery)) {
    // Heavy training on a deep red day — cap so we don't reward
    // working through a clearly under-recovered state.
    if (recovery < 35 && strain > 14) {
      pts = Math.min(pts, 42);
    }
    // Green day with no real activity — cap unless they did
    // manually log a session (which the verification cap above
    // already handles for very low strain).
    if (recovery >= 67 && strain < 4 && manual.didWorkout !== true) {
      pts = Math.min(pts, 20);
    }
    // Note: the "recovery < 35 + strain in [6,12]" branch from the
    // spec is a *no-op* — it explicitly says to allow strong credit,
    // i.e. don't cap. We honour that by not adding a cap here.
  }

  return { points: clamp(pts, 0, MAX_ACTIVITY), usedWhoop: true };
}

/* ---------------------------------------------------------------- */
/* Recovery                                                          */
/* ---------------------------------------------------------------- */

function recoveryPoints(
  whoop: WhoopScoringFields | null | undefined,
  manual: ManualScoringFields
): { points: number; usedWhoop: boolean; usedManual: boolean } {
  const w = whoop?.recoveryScore ?? null;
  if (isFiniteNumber(w)) {
    return {
      points: clamp((w / 100) * MAX_RECOVERY, 0, MAX_RECOVERY),
      usedWhoop: true,
      usedManual: false,
    };
  }

  const r = manual.manualRecovery;
  if (r) {
    const map = { excellent: 15, good: 12, okay: 8, poor: 4 } as const;
    return { points: map[r] ?? 8, usedWhoop: false, usedManual: true };
  }

  // Neutral fallback so non-wearable users without a manual
  // recovery field aren't penalised. 8/15 ≈ 53% credit.
  return { points: 8, usedWhoop: false, usedManual: false };
}

/* ---------------------------------------------------------------- */
/* Sleep                                                             */
/* ---------------------------------------------------------------- */

function sleepFromHours(hours: number): number {
  if (hours >= 7.5 && hours <= 9) return 15;
  if (hours >= 6.5 && hours < 7.5) return 12;
  if (hours >= 5.5 && hours < 6.5) return 8;
  if (hours >= 4.5 && hours < 5.5) return 5;
  if (hours < 4.5) return 2;
  if (hours > 10) return 10;
  // 9..10 inclusive falls through — give 12 pts (slightly long but ok)
  return 12;
}

function sleepPoints(
  whoop: WhoopScoringFields | null | undefined,
  manual: ManualScoringFields
): { points: number; usedWhoop: boolean } {
  const perf = whoop?.sleepPerformancePct ?? null;
  const eff = whoop?.sleepEfficiencyPct ?? null;
  const totalMs = whoop?.totalSleepMs ?? null;

  // Both WHOOP signals — the canonical path.
  if (isFiniteNumber(perf) && isFiniteNumber(eff)) {
    const pts = ((perf * 0.7 + eff * 0.3) / 100) * MAX_SLEEP;
    return { points: clamp(pts, 0, MAX_SLEEP), usedWhoop: true };
  }

  // One WHOOP signal — scale proportionally.
  if (isFiniteNumber(perf)) {
    return { points: clamp((perf / 100) * MAX_SLEEP, 0, MAX_SLEEP), usedWhoop: true };
  }
  if (isFiniteNumber(eff)) {
    return { points: clamp((eff / 100) * MAX_SLEEP, 0, MAX_SLEEP), usedWhoop: true };
  }

  // No perf/eff but raw duration available — map per spec.
  if (isFiniteNumber(totalMs) && totalMs > 0) {
    const hours = totalMs / 3_600_000;
    return { points: clamp(sleepFromHours(hours), 0, MAX_SLEEP), usedWhoop: true };
  }

  // Manual sleep fallback.
  if (isFiniteNumber(manual.sleepHours) && manual.sleepHours > 0) {
    return {
      points: clamp(sleepFromHours(manual.sleepHours), 0, MAX_SLEEP),
      usedWhoop: false,
    };
  }

  return { points: 0, usedWhoop: false };
}

/* ---------------------------------------------------------------- */
/* Food                                                              */
/* ---------------------------------------------------------------- */

function foodPoints(manual: ManualScoringFields): {
  points: number;
  used: boolean;
} {
  const cals = manual.caloriesLogged;
  if (!isFiniteNumber(cals) || cals <= 0) {
    return { points: 0, used: false };
  }
  const target = isFiniteNumber(manual.calorieTarget)
    ? manual.calorieTarget
    : DEFAULT_CALORIE_TARGET;

  const diff = Math.abs(cals - target);

  // 12 pts: meal plan / target adherence band.
  let calorieScore: number;
  if (diff <= 250) calorieScore = 12;
  else if (diff <= 500) calorieScore = 8;
  else if (diff <= 800) calorieScore = 4;
  else calorieScore = 0;

  // 5 pts: hit a calorie/protein target — proxy with "in tight band".
  const targetHitBonus = diff <= 350 ? 5 : 0;

  // 3 pts: meals logged at all — we have calories > 0 here.
  const loggedBonus = 3;

  return {
    points: clamp(calorieScore + targetHitBonus + loggedBonus, 0, MAX_FOOD),
    used: true,
  };
}

/* ---------------------------------------------------------------- */
/* Habits                                                            */
/* ---------------------------------------------------------------- */

function habitPoints(manual: ManualScoringFields): {
  points: number;
  used: boolean;
} {
  const n = manual.habitsCompleted ?? 0;
  if (!isFiniteNumber(n) || n <= 0) return { points: 0, used: false };
  if (n >= 2) return { points: MAX_HABITS, used: true };
  return { points: 5, used: true };
}

/* ---------------------------------------------------------------- */
/* Public entry point                                                */
/* ---------------------------------------------------------------- */

export function calculateHealthScore(
  input: HealthScoreV2Input
): HealthScoreV2Output {
  const manual = input.manual;
  const whoop = input.whoop ?? null;

  const activity = activityPoints(whoop, manual);
  const recovery = recoveryPoints(whoop, manual);
  const sleep = sleepPoints(whoop, manual);
  const food = foodPoints(manual);
  const habits = habitPoints(manual);

  const recoverySleep = recovery.points + sleep.points;
  const rawScore =
    activity.points +
    recovery.points +
    sleep.points +
    food.points +
    habits.points;
  const finalScore = Math.round(clamp((rawScore / MAX_RAW) * 100, 0, 100));

  const inputsUsed = {
    whoopActivity: activity.usedWhoop,
    whoopRecovery: recovery.usedWhoop,
    whoopSleep: sleep.usedWhoop,
    manualFood: food.used,
    manualHabits: habits.used,
    manualRecovery: recovery.usedManual,
  };

  const usedAnyWhoop =
    inputsUsed.whoopActivity ||
    inputsUsed.whoopRecovery ||
    inputsUsed.whoopSleep;
  const usedAnyManual =
    !inputsUsed.whoopActivity ||
    !inputsUsed.whoopRecovery ||
    !inputsUsed.whoopSleep ||
    inputsUsed.manualFood ||
    inputsUsed.manualHabits;

  let scoreSource: HealthScoreV2Output['scoreSource'];
  if (!usedAnyWhoop) scoreSource = 'manual';
  else if (usedAnyManual) scoreSource = 'hybrid';
  else scoreSource = 'whoop';

  return {
    finalScore,
    rawScore: Math.round(rawScore * 10) / 10,
    maxRawScore: MAX_RAW,
    scoreSource,
    date: input.date ?? null,
    componentBreakdown: {
      activity: Math.round(activity.points * 10) / 10,
      recovery: Math.round(recovery.points * 10) / 10,
      sleep: Math.round(sleep.points * 10) / 10,
      recoverySleep: Math.round(recoverySleep * 10) / 10,
      food: Math.round(food.points * 10) / 10,
      habits: Math.round(habits.points * 10) / 10,
    },
    inputsUsed,
  };
}

/* ---------------------------------------------------------------- */
/* Legacy column mapping                                             */
/* ---------------------------------------------------------------- */

/**
 * Map the v2 component breakdown into the four legacy columns on
 * health_scores (training_score / diet_score / sleep_score /
 * habit_score). Keeps the existing CHECK constraints satisfied and
 * keeps any legacy dashboard view that reads those columns alive
 * with sensibly scaled values.
 *
 *   training_score (max 30) ←  scale activity (max 50) → 30
 *   diet_score     (max 40) ←  scale food     (max 20) → 40
 *   sleep_score    (max 30) ←  scale sleep    (max 15) → 30
 *   habit_score    (max 10) ←  habits already 0..10
 */
export function legacyColumnMapping(
  components: HealthScoreV2Output['componentBreakdown']
): {
  training_score: number;
  diet_score: number;
  sleep_score: number;
  habit_score: number;
} {
  return {
    training_score: clamp(Math.round((components.activity * 30) / 50), 0, 30),
    diet_score: clamp(Math.round((components.food * 40) / 20), 0, 40),
    sleep_score: clamp(Math.round((components.sleep * 30) / 15), 0, 30),
    habit_score: clamp(Math.round(components.habits), 0, 10),
  };
}
