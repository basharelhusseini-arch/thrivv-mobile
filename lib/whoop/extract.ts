/**
 * Defensive extraction helpers for WHOOP v2 API payloads.
 *
 * WHOOP's response shapes change over time and across API versions
 * (v1 vs v2 use different field names; recovery_score has lived on
 * both `score` and `score.recovery_score`). These helpers walk
 * payloads with optional chaining only and never throw on a
 * missing field.
 *
 * Every helper returns either a normalised value or null. Null
 * always means "not available" — never substitute a default.
 */

export type WhoopPayloadRecord = Record<string, unknown> & {
  score?: Record<string, unknown> | number | null;
};

export type WhoopRecoverySummary = {
  recoveryScore: number | null;
  hrv: number | null;
  restingHr: number | null;
};

export type WhoopSleepSummary = {
  sleepPerformancePct: number | null;
  sleepEfficiencyPct: number | null;
  totalSleepMs: number | null;
};

export type WhoopCycleSummary = {
  dayStrain: number | null;
  kilojoules: number | null;
};

/**
 * Pull the first scored record from a WHOOP "records" envelope.
 * Recovery / sleep / cycle endpoints all return `{ records: [] }`.
 * Falls back to `data` for older v1 shapes.
 */
export function pickFirstScoredRecord(
  payload: unknown
): WhoopPayloadRecord | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  const records = (obj.records ?? obj.data) as unknown;
  if (!Array.isArray(records) || records.length === 0) return null;

  // Prefer SCORED records when score_state is present.
  const scored = records.find(
    (r) =>
      r &&
      typeof r === 'object' &&
      ((r as Record<string, unknown>).score_state === 'SCORED' ||
        (r as Record<string, unknown>).score)
  );
  return ((scored as WhoopPayloadRecord) ?? null) || null;
}

function asFiniteNumber(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/**
 * v2 recovery payload extraction. Tolerant of nested vs flat shapes.
 */
export function extractRecovery(payload: unknown): WhoopRecoverySummary {
  const record = pickFirstScoredRecord(payload);
  if (!record) {
    return { recoveryScore: null, hrv: null, restingHr: null };
  }
  const score =
    record.score && typeof record.score === 'object' ? (record.score as Record<string, unknown>) : null;

  const recoveryScore =
    asFiniteNumber(score?.recovery_score) ??
    asFiniteNumber((record as Record<string, unknown>).recovery_score) ??
    asFiniteNumber(record.score as unknown);

  const hrv =
    asFiniteNumber(score?.hrv_rmssd_milli) ??
    asFiniteNumber(score?.hrv) ??
    asFiniteNumber((record as Record<string, unknown>).hrv);

  const restingHr =
    asFiniteNumber(score?.resting_heart_rate) ??
    asFiniteNumber(score?.resting_hr) ??
    asFiniteNumber((record as Record<string, unknown>).resting_heart_rate);

  return { recoveryScore, hrv, restingHr };
}

/**
 * v2 sleep payload extraction. Returns ms for total in-bed time.
 */
export function extractSleep(payload: unknown): WhoopSleepSummary {
  const record = pickFirstScoredRecord(payload);
  if (!record) {
    return {
      sleepPerformancePct: null,
      sleepEfficiencyPct: null,
      totalSleepMs: null,
    };
  }
  const score =
    record.score && typeof record.score === 'object' ? (record.score as Record<string, unknown>) : null;

  const sleepPerformancePct =
    asFiniteNumber(score?.sleep_performance_percentage) ??
    asFiniteNumber(score?.sleep_performance_pct);

  const sleepEfficiencyPct =
    asFiniteNumber(score?.sleep_efficiency_percentage) ??
    asFiniteNumber(score?.sleep_efficiency_pct);

  const stageSummary =
    score?.stage_summary && typeof score.stage_summary === 'object'
      ? (score.stage_summary as Record<string, unknown>)
      : null;

  const totalSleepMs =
    asFiniteNumber(stageSummary?.total_in_bed_time_milli) ??
    asFiniteNumber(score?.total_in_bed_time_milli) ??
    asFiniteNumber((record as Record<string, unknown>).total_in_bed_time_milli);

  return { sleepPerformancePct, sleepEfficiencyPct, totalSleepMs };
}

/**
 * v2 cycle payload extraction. day_strain is 0–21 in WHOOP's scale.
 */
export function extractCycle(payload: unknown): WhoopCycleSummary {
  const record = pickFirstScoredRecord(payload);
  if (!record) {
    return { dayStrain: null, kilojoules: null };
  }
  const score =
    record.score && typeof record.score === 'object' ? (record.score as Record<string, unknown>) : null;

  const dayStrain =
    asFiniteNumber(score?.strain) ??
    asFiniteNumber(score?.day_strain) ??
    asFiniteNumber((record as Record<string, unknown>).strain);

  const kilojoules =
    asFiniteNumber(score?.kilojoule) ??
    asFiniteNumber(score?.kilojoules) ??
    asFiniteNumber((record as Record<string, unknown>).kilojoule);

  return { dayStrain, kilojoules };
}
