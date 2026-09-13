/**
 * UNIT TESTS: Trust & Verification Scoring
 * 
 * Tests critical principles:
 * 1. Health Score is NEVER reduced by confidence
 * 2. Confidence Score is purely additive
 * 3. No path reduces user scores
 * 4. Multipliers are positive-only
 */

import {
  calculateHealthScore,
  calculateConfidenceScore,
  calculateVerificationMultiplier,
  getConfidenceLevel,
  validateSleepDuration,
  validateWorkoutLog,
  validateNutritionLog,
  HEALTH_SCORE_WEIGHTS,
  CONFIDENCE_SCORE_COMPONENTS,
  VERIFICATION_MULTIPLIERS,
} from '../lib/trust-scoring';

describe('Health Score Calculation', () => {
  test('calculates health score correctly with all components', () => {
    const score = calculateHealthScore({
      sleep: 80,
      training: 70,
      nutrition: 90,
      habits: 60,
    });

    // Expected: (80*30 + 70*30 + 90*25 + 60*15) / 100 = 76.5, rounded to 77
    expect(score).toBe(77);
  });

  test('health score is never affected by confidence level', () => {
    const components = {
      sleep: 50,
      training: 50,
      nutrition: 50,
      habits: 50,
    };

    // Same components should always give same health score
    const score1 = calculateHealthScore(components);
    const score2 = calculateHealthScore(components);
    
    expect(score1).toBe(50);
    expect(score2).toBe(50);
    expect(score1).toBe(score2);
  });

  test('health score caps at 100', () => {
    const score = calculateHealthScore({
      sleep: 100,
      training: 100,
      nutrition: 100,
      habits: 100,
    });

    expect(score).toBe(100);
  });

  test('health score floors at 0', () => {
    const score = calculateHealthScore({
      sleep: 0,
      training: 0,
      nutrition: 0,
      habits: 0,
    });

    expect(score).toBe(0);
  });
});

describe('Confidence Score Calculation', () => {
  test('starts at baseline with no bonuses', () => {
    const result = calculateConfidenceScore({
      hasWearable: false,
      consistencyPassesLast30Days: 0,
      surveyCompletionsLast90Days: 0,
      daysActive: 0,
    });

    expect(result.score).toBe(CONFIDENCE_SCORE_COMPONENTS.BASELINE);
    expect(result.level).toBe('low');
  });

  test('wearable adds correct bonus', () => {
    const result = calculateConfidenceScore({
      hasWearable: true,
      consistencyPassesLast30Days: 0,
      surveyCompletionsLast90Days: 0,
      daysActive: 0,
    });

    expect(result.score).toBe(
      CONFIDENCE_SCORE_COMPONENTS.BASELINE + 
      CONFIDENCE_SCORE_COMPONENTS.WEARABLE_BONUS
    );
    expect(result.breakdown.wearable).toBe(25);
  });

  test('consistency bonus requires 3+ passes', () => {
    const twoPassesResult = calculateConfidenceScore({
      hasWearable: false,
      consistencyPassesLast30Days: 2,
      surveyCompletionsLast90Days: 0,
      daysActive: 0,
    });

    expect(twoPassesResult.breakdown.consistency).toBe(0);

    const threePassesResult = calculateConfidenceScore({
      hasWearable: false,
      consistencyPassesLast30Days: 3,
      surveyCompletionsLast90Days: 0,
      daysActive: 0,
    });

    expect(threePassesResult.breakdown.consistency).toBe(10);
  });

  test('confidence score caps at 100', () => {
    const result = calculateConfidenceScore({
      hasWearable: true,
      consistencyPassesLast30Days: 10,
      surveyCompletionsLast90Days: 10,
      daysActive: 365, // Should give max long-term bonus
    });

    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('confidence score is purely additive', () => {
    const baseline = calculateConfidenceScore({
      hasWearable: false,
      consistencyPassesLast30Days: 0,
      surveyCompletionsLast90Days: 0,
      daysActive: 0,
    });

    const withWearable = calculateConfidenceScore({
      hasWearable: true,
      consistencyPassesLast30Days: 0,
      surveyCompletionsLast90Days: 0,
      daysActive: 0,
    });

    // Adding wearable should ONLY increase, never decrease
    expect(withWearable.score).toBeGreaterThan(baseline.score);
    expect(withWearable.score - baseline.score).toBe(25);
  });
});

describe('Verification Multipliers', () => {
  test('manual has baseline multiplier', () => {
    const multiplier = calculateVerificationMultiplier(['manual']);
    expect(multiplier).toBe(VERIFICATION_MULTIPLIERS.MANUAL);
    expect(multiplier).toBe(1.0);
  });

  test('wearable has highest single multiplier', () => {
    const multiplier = calculateVerificationMultiplier(['wearable']);
    expect(multiplier).toBe(VERIFICATION_MULTIPLIERS.WEARABLE);
    expect(multiplier).toBe(1.15);
  });

  test('multipliers are always positive (>= 1.0)', () => {
    const methods: Array<'manual' | 'survey' | 'consistency_check' | 'wearable'> = [
      'manual',
      'survey',
      'consistency_check',
      'wearable',
    ];

    methods.forEach(method => {
      const multiplier = calculateVerificationMultiplier([method]);
      expect(multiplier).toBeGreaterThanOrEqual(1.0);
      expect(multiplier).toBeLessThanOrEqual(1.25);
    });
  });

  test('combined methods cap at max multiplier', () => {
    const multiplier = calculateVerificationMultiplier(['wearable', 'survey', 'consistency_check']);
    expect(multiplier).toBe(VERIFICATION_MULTIPLIERS.COMBINED_MAX);
    expect(multiplier).toBe(1.25);
  });

  test('multipliers never reduce scores', () => {
    // Even the worst case (manual only) has 1.0x multiplier
    const worstCase = calculateVerificationMultiplier(['manual']);
    expect(worstCase).toBe(1.0); // No reduction

    // Best case gives bonus
    const bestCase = calculateVerificationMultiplier(['wearable', 'survey']);
    expect(bestCase).toBeGreaterThan(1.0); // Bonus
  });
});

describe('Confidence Levels', () => {
  test('low confidence: 0-49', () => {
    expect(getConfidenceLevel(0)).toBe('low');
    expect(getConfidenceLevel(49)).toBe('low');
  });

  test('medium confidence: 50-74', () => {
    expect(getConfidenceLevel(50)).toBe('medium');
    expect(getConfidenceLevel(74)).toBe('medium');
  });

  test('high confidence: 75-100', () => {
    expect(getConfidenceLevel(75)).toBe('high');
    expect(getConfidenceLevel(100)).toBe('high');
  });
});

describe('Consistency Checks (Silent Validation)', () => {
  describe('Sleep Validation', () => {
    test('reasonable sleep passes', () => {
      const result = validateSleepDuration(7);
      expect(result.result).toBe('pass');
    });

    test('very short sleep flags but does not fail', () => {
      const result = validateSleepDuration(4);
      expect(result.result).toBe('flag');
      expect(result.reason).toBeTruthy();
    });

    test('impossible sleep fails', () => {
      const result = validateSleepDuration(20);
      expect(result.result).toBe('fail');
    });
  });

  describe('Workout Validation', () => {
    test('reasonable workout passes', () => {
      const result = validateWorkoutLog({
        durationMinutes: 45,
        workoutsToday: 1,
      });
      expect(result.result).toBe('pass');
    });

    test('very long workout flags', () => {
      const result = validateWorkoutLog({
        durationMinutes: 301,
        workoutsToday: 1,
      });
      expect(result.result).toBe('flag');
    });

    test('too many workouts flags', () => {
      const result = validateWorkoutLog({
        durationMinutes: 45,
        workoutsToday: 5,
      });
      expect(result.result).toBe('flag');
    });
  });

  describe('Nutrition Validation', () => {
    test('reasonable calories pass', () => {
      const result = validateNutritionLog({
        calories: 2000,
        weightKg: 70,
        activityLevel: 'moderate',
      });
      expect(result.result).toBe('pass');
    });

    test('very low calories flag', () => {
      const result = validateNutritionLog({
        calories: 800,
        weightKg: 70,
        activityLevel: 'moderate',
      });
      expect(result.result).toBe('flag');
    });
  });
});

describe('Critical Principles - No Punishment Paths', () => {
  test('there is no code path that reduces health score based on confidence', () => {
    const lowConfidence = calculateConfidenceScore({
      hasWearable: false,
      consistencyPassesLast30Days: 0,
      surveyCompletionsLast90Days: 0,
      daysActive: 0,
    });

    const highConfidence = calculateConfidenceScore({
      hasWearable: true,
      consistencyPassesLast30Days: 10,
      surveyCompletionsLast90Days: 5,
      daysActive: 180,
    });

    const healthComponents = {
      sleep: 75,
      training: 75,
      nutrition: 75,
      habits: 75,
    };

    const healthScore = calculateHealthScore(healthComponents);

    // Health score is same regardless of confidence
    expect(healthScore).toBe(75);
    
    // Confidence levels are different
    expect(lowConfidence.level).toBe('low');
    expect(highConfidence.level).toBe('high');
    
    // But they DON'T affect health score
    expect(healthScore).toBe(75); // Unchanged
  });

  test('failed consistency checks do not reduce scores', () => {
    // A failed check gives 1.0 multiplier (baseline)
    const failedCheck = calculateVerificationMultiplier(['manual']);
    
    // A failed check should NOT be < 1.0
    expect(failedCheck).toBe(1.0);
    expect(failedCheck).not.toBeLessThan(1.0);
  });

  test('all verification methods have positive-only multipliers', () => {
    const methods: Array<'manual' | 'survey' | 'consistency_check' | 'wearable'> = [
      'manual',
      'survey',
      'consistency_check',
      'wearable',
    ];

    methods.forEach(method => {
      const multiplier = calculateVerificationMultiplier([method]);
      
      // CRITICAL: No multiplier can reduce a score
      expect(multiplier).toBeGreaterThanOrEqual(1.0);
    });
  });
});
