/**
 * Hybrid Thrivv health-score calculator — WHOOP-aware.
 *
 * This is a parallel scorer to lib/health-score.ts. The original
 * 110-scale calculator (training 30 + diet 40 + sleep 30 +
 * habits 10) is left untouched and continues to drive the manual
 * check-in flow. This file implements the alternate 100-scale
 * model from the WHOOP integration spec:
 *
 *   Recovery / Readiness     30 points  (WHOOP recovery_score)
 *   Sleep                    30 points  (WHOOP sleep performance + efficiency, or manual sleep)
 *   Activity / Strain        25 points  (WHOOP day_strain, or manual workout)
 *   Consistency / Habits     15 points  (Thrivv habits, never WHOOP)
 *
 * Used by /api/whoop/sync after a successful WHOOP pull. The
 * result's `score` field replaces the dashboard's headline score
 * for that date when WHOOP data is available; existing manual
 * breakdown columns (training_score / diet_score / sleep_score /
 * habit_score) on health_scores remain untouched.
 *
 * Design rules:
 *   - Every input is optional. Missing data → that component
 *     contributes 0 (NEVER a synthetic / made-up value), and
 *     `inputsUsed` reflects what was actually consumed.
 *   - Manual workout earns full activity credit when WHOOP
 *     day_strain corroborates it (≥ 8). When manual reports an
 *     intense workout but day_strain < 4, activity credit is
 *     capped at 50% — defensive verification, not fraud
 *     detection.
 *   - Final score is clamped to [0, 100] and rounded to integer
 *     to match the existing health_scores.score column type.
 */

export type ScoreSource = 'manual' | 'whoop' | 'hybrid';

export type WhoopScoringInput = {
  /** WHOOP recovery score (0–100). null = not synced. */
  whoopRecovery: number | null;
  /** WHOOP sleep performance percentage (0–100). */
  whoopSleepPerformancePct: number | null;
  /** WHOOP sleep efficiency percentage (0–100). */
  whoopSleepEfficiencyPct: number | null;
  /** WHOOP day strain (0–21 scale). */
  whoopDayStrain: number | null;
  /** Manual: did the user log a workout today? */
  manualDidWorkout: boolean | null;
  /** Manual: hours slept (used as fallback when WHOOP sleep is missing). */
  manualSleepHours: number | null;
  /** Manual: count of habits logged today. */
  manualHabitsCompleted: number | null;
};

export type WhoopScoringOutput = {
  score: number;
  date: string;
  source: ScoreSource;
  components: {
    recovery: number;
    sleep: number;
    activity: number;
    habits: number;
  };
  inputsUsed: {
    whoopRecovery: boolean;
    whoopSleep: boolean;
    whoopStrain: boolean;
    manualHabits: boolean;
  };
};

const MAX_RECOVERY = 30;
const MAX_SLEEP = 30;
const MAX_ACTIVITY = 25;
const MAX_HABITS = 15;

const SLEEP_PERFORMANCE_WEIGHT = 20;
const SLEEP_EFFICIENCY_WEIGHT = 10;

/** Clamp helper. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Recovery → 30 points, linear off the 0–100 WHOOP recovery score.
 * Returns 0 when WHOOP recovery is missing — the caller decides
 * whether to fall back to a neutral baseline.
 */
function recoveryPoints(whoopRecovery: number | null): number {
  if (whoopRecovery == null) return 0;
  const r = clamp(whoopRecovery, 0, 100);
  return (r / 100) * MAX_RECOVERY;
}

/**
 * Sleep → 30 points. WHOOP gives us two complementary signals:
 *   - sleep_performance_pct (how close the user got to their need)
 *   - sleep_efficiency_pct (how efficient the sleep itself was)
 *
 * If only one is present, that signal alone covers its sub-cap.
 * If neither is present and the user manually logged hours,
 * fall back to a coarse sleep-hours mapping that maxes out at
 * 30 points for 7–9 hours, matching the existing manual scorer.
 */
function sleepPoints(
  whoopPerformance: number | null,
  whoopEfficiency: number | null,
  manualSleepHours: number | null
): { points: number; usedWhoop: boolean } {
  if (whoopPerformance != null || whoopEfficiency != null) {
    const perf = whoopPerformance != null ? clamp(whoopPerformance, 0, 100) : 0;
    const eff = whoopEfficiency != null ? clamp(whoopEfficiency, 0, 100) : 0;
    const points =
      (perf / 100) * SLEEP_PERFORMANCE_WEIGHT +
      (eff / 100) * SLEEP_EFFICIENCY_WEIGHT;
    return { points, usedWhoop: true };
  }

  if (manualSleepHours != null && manualSleepHours > 0) {
    if (manualSleepHours >= 7 && manualSleepHours <= 9) return { points: 30, usedWhoop: false };
    if (
      (manualSleepHours >= 6 && manualSleepHours < 7) ||
      (manualSleepHours > 9 && manualSleepHours <= 10)
    ) {
      return { points: 20, usedWhoop: false };
    }
    if (
      (manualSleepHours >= 5 && manualSleepHours < 6) ||
      (manualSleepHours > 10 && manualSleepHours <= 11)
    ) {
      return { points: 10, usedWhoop: false };
    }
    return { points: 5, usedWhoop: false };
  }

  return { points: 0, usedWhoop: false };
}

/**
 * Activity → 25 points. Mapping per the spec; smooth piecewise
 * linear interpolation between the four anchor points so a
 * day_strain of 6 doesn't suddenly award the same as 4.
 *
 *   0 strain  =>  0 points
 *   4 strain  =>  8 points
 *   8 strain  => 16 points
 *  12 strain  => 23 points
 *  16+ strain => 25 points (capped)
 */
function activityPointsFromStrain(strain: number): number {
  const s = clamp(strain, 0, 100);
  if (s >= 16) return MAX_ACTIVITY;
  if (s <= 0) return 0;

  const anchors: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [4, 8],
    [8, 16],
    [12, 23],
    [16, 25],
  ];

  for (let i = 0; i < anchors.length - 1; i++) {
    const [lo, loPts] = anchors[i];
    const [hi, hiPts] = anchors[i + 1];
    if (s >= lo && s <= hi) {
      const ratio = (s - lo) / (hi - lo);
      return loPts + ratio * (hiPts - loPts);
    }
  }
  return MAX_ACTIVITY;
}

/**
 * Compute activity points + apply the verification rule:
 *   - WHOOP strain >= 8 ........ full credit
 *   - WHOOP strain < 4 + manual workout ... cap at 50% (12.5 pts)
 *   - No WHOOP strain ........... fall back to manual workout
 */
function activityPoints(
  whoopDayStrain: number | null,
  manualDidWorkout: boolean | null
): { points: number; usedWhoop: boolean } {
  if (whoopDayStrain != null) {
    let pts = activityPointsFromStrain(whoopDayStrain);

    if (manualDidWorkout && whoopDayStrain < 4) {
      pts = Math.min(pts, MAX_ACTIVITY * 0.5);
    }
    return { points: pts, usedWhoop: true };
  }

  if (manualDidWorkout === true) {
    // No WHOOP signal — give the existing manual-workout flow full
    // credit so disconnected users aren't penalised.
    return { points: MAX_ACTIVITY, usedWhoop: false };
  }
  return { points: 0, usedWhoop: false };
}

/**
 * Habits → 15 points. Two habits = full credit, one habit = 7,
 * none = 0. Mirrors the existing manual scorer's cliff but on the
 * 15-point cap.
 */
function habitPoints(manualHabitsCompleted: number | null): number {
  if (!manualHabitsCompleted || manualHabitsCompleted <= 0) return 0;
  if (manualHabitsCompleted >= 2) return MAX_HABITS;
  return 7;
}

export function calculateHybridHealthScore(
  input: WhoopScoringInput,
  date: string
): WhoopScoringOutput {
  const recovery = recoveryPoints(input.whoopRecovery);
  const sleep = sleepPoints(
    input.whoopSleepPerformancePct,
    input.whoopSleepEfficiencyPct,
    input.manualSleepHours
  );
  const activity = activityPoints(input.whoopDayStrain, input.manualDidWorkout);
  const habits = habitPoints(input.manualHabitsCompleted);

  const total = recovery + sleep.points + activity.points + habits;

  const inputsUsed = {
    whoopRecovery: input.whoopRecovery != null,
    whoopSleep: sleep.usedWhoop,
    whoopStrain: activity.usedWhoop,
    manualHabits: (input.manualHabitsCompleted ?? 0) > 0,
  };

  const usedAnyWhoop =
    inputsUsed.whoopRecovery || inputsUsed.whoopSleep || inputsUsed.whoopStrain;
  const usedAnyManual =
    !inputsUsed.whoopSleep ||
    !inputsUsed.whoopStrain ||
    inputsUsed.manualHabits;

  let source: ScoreSource;
  if (usedAnyWhoop && usedAnyManual) source = 'hybrid';
  else if (usedAnyWhoop) source = 'whoop';
  else source = 'manual';

  return {
    score: Math.round(clamp(total, 0, 100)),
    date,
    source,
    components: {
      recovery: Math.round(recovery * 10) / 10,
      sleep: Math.round(sleep.points * 10) / 10,
      activity: Math.round(activity.points * 10) / 10,
      habits: Math.round(habits * 10) / 10,
    },
    inputsUsed,
  };
}
