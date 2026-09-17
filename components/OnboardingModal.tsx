'use client';

/**
 * ONBOARDING MODAL
 * 
 * Shown on first login to collect:
 * - Primary health goal
 * - Wearable status and preferences
 * - Optional: wearable interest for future programs
 * 
 * Tone: Supportive, never judgmental
 * Key message: Wearables are optional, all data is valuable
 */

import { useState, useEffect } from 'react';
import { X, Target, Heart, Zap, Activity, Sparkles, Check } from 'lucide-react';
import { HealthGoal, WearableType, WearableInterest } from '@/types';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  userId: string;
}

const GOALS: Array<{
  value: HealthGoal;
  label: string;
  description: string;
  icon: typeof Target;
}> = [
  {
    value: 'fat_loss',
    label: 'Fat Loss',
    description: 'Lose weight sustainably while preserving muscle',
    icon: Target,
  },
  {
    value: 'muscle_gain',
    label: 'Muscle Gain',
    description: 'Build muscle and strength progressively',
    icon: Zap,
  },
  {
    value: 'performance',
    label: 'Performance',
    description: 'Optimize athletic performance and recovery',
    icon: Activity,
  },
  {
    value: 'maintenance',
    label: 'Maintenance',
    description: 'Maintain current physique and fitness level',
    icon: Heart,
  },
  {
    value: 'general',
    label: 'General Health',
    description: 'Improve overall health and wellness',
    icon: Sparkles,
  },
];

const WEARABLES: Array<{ value: WearableType; label: string }> = [
  { value: 'whoop', label: 'WHOOP' },
  { value: 'garmin', label: 'Garmin' },
  { value: 'apple_watch', label: 'Apple Watch' },
  { value: 'fitbit', label: 'Fitbit' },
  { value: 'oura', label: 'Oura Ring' },
  { value: 'other', label: 'Other' },
];

export default function OnboardingModal({ isOpen, onComplete, userId }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<HealthGoal | null>(null);
  const [hasWearable, setHasWearable] = useState<boolean | null>(null);
  const [wearableType, setWearableType] = useState<WearableType>(null);
  const [wantsWearable, setWantsWearable] = useState<WearableInterest | null>(null);
  const [loading, setLoading] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!goal) return;

    setLoading(true);

    try {
      const response = await fetch('/api/health/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          goal,
          has_wearable: hasWearable || false,
          wearable_type: wearableType,
          wants_wearable_provided: wantsWearable,
          country: null, // Could add country detection later
        }),
      });

      if (response.ok) {
        onComplete();
      } else {
        console.error('Failed to save profile');
        alert('Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-thrivv-bg-card border border-thrivv-gold-500/20 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-thrivv-gold-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-badge bg-thrivv-gold-500/10">
                <Sparkles className="w-6 h-6 text-thrivv-gold-500" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-thrivv-text-primary">
                  Welcome to Thrivv
                </h2>
                <p className="text-sm text-thrivv-text-muted">
                  Let&apos;s personalize your experience
                </p>
              </div>
            </div>
            <div className="text-xs text-thrivv-text-muted">
              Step {step} of 2
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Goal Selection */}
          {step === 1 && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <h3 className="text-lg font-semibold text-thrivv-text-primary mb-2">
                  What&apos;s your primary health goal?
                </h3>
                <p className="text-sm text-thrivv-text-secondary">
                  This helps us tailor your experience. You can change this anytime.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOALS.map((g) => {
                  const Icon = g.icon;
                  return (
                    <button
                      key={g.value}
                      onClick={() => setGoal(g.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        goal === g.value
                          ? 'border-thrivv-gold-500 bg-thrivv-gold-500/10'
                          : 'border-thrivv-gold-500/20 bg-thrivv-bg-card hover:border-thrivv-gold-500/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${
                          goal === g.value ? 'text-thrivv-gold-500' : 'text-thrivv-text-muted'
                        }`} />
                        <div>
                          <div className="font-semibold text-thrivv-text-primary flex items-center gap-2">
                            {g.label}
                            {goal === g.value && (
                              <Check className="w-4 h-4 text-thrivv-gold-500" />
                            )}
                          </div>
                          <div className="text-xs text-thrivv-text-muted mt-1">
                            {g.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={!goal}
                  className="btn-primary px-6 py-3"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Wearable Info */}
          {step === 2 && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <h3 className="text-lg font-semibold text-thrivv-text-primary mb-2">
                  Do you use a fitness wearable?
                </h3>
                <p className="text-sm text-thrivv-text-secondary">
                  Wearables improve data accuracy but are <span className="text-thrivv-gold-500 font-semibold">completely optional</span>.
                  All logging methods are valuable.
                </p>
              </div>

              {/* Has Wearable? */}
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setHasWearable(true);
                      setWantsWearable(null);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      hasWearable === true
                        ? 'border-thrivv-gold-500 bg-thrivv-gold-500/10'
                        : 'border-thrivv-gold-500/20 bg-thrivv-bg-card hover:border-thrivv-gold-500/40'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-thrivv-text-primary">
                        Yes
                      </div>
                      <div className="text-xs text-thrivv-text-muted mt-1">
                        I have a wearable
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setHasWearable(false);
                      setWearableType(null);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      hasWearable === false
                        ? 'border-thrivv-gold-500 bg-thrivv-gold-500/10'
                        : 'border-thrivv-gold-500/20 bg-thrivv-bg-card hover:border-thrivv-gold-500/40'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-thrivv-text-primary">
                        No
                      </div>
                      <div className="text-xs text-thrivv-text-muted mt-1">
                        Manual logging only
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* If yes, which type? */}
              {hasWearable === true && (
                <div className="animate-slide-up">
                  <label className="block text-sm font-medium text-thrivv-text-primary mb-2">
                    Which wearable do you use?
                  </label>
                  <select
                    value={wearableType || ''}
                    onChange={(e) => setWearableType((e.target.value as WearableType) || null)}
                    className="input-premium w-full"
                  >
                    <option value="">Select your wearable</option>
                    {WEARABLES.map((w) => (
                      <option key={w.value} value={w.value || ''}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-thrivv-text-muted mt-2">
                    Join your gym, scan and earn points. Connect WHOOP later in Wearable.
                  </p>
                </div>
              )}

              {/* If no, interested in being provided one? */}
              {hasWearable === false && (
                <div className="animate-slide-up">
                  <label className="block text-sm font-medium text-thrivv-text-primary mb-3">
                    Interested in being provided a wearable in the future?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['yes', 'maybe', 'no'] as WearableInterest[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => setWantsWearable(option)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          wantsWearable === option
                            ? 'border-thrivv-gold-500 bg-thrivv-gold-500/10'
                            : 'border-thrivv-gold-500/20 bg-thrivv-bg-card hover:border-thrivv-gold-500/40'
                        }`}
                      >
                        <div className="text-sm font-semibold text-thrivv-text-primary capitalize">
                          {option}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-thrivv-text-muted mt-2">
                    We&apos;re exploring partnerships to provide wearables to users
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-thrivv-gold-500/10">
                <button
                  onClick={() => setStep(1)}
                  className="btn-ghost px-6 py-3"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || hasWearable === null}
                  className="btn-primary px-8 py-3 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Complete Setup
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-4 bg-thrivv-bg-dark/50 border-t border-thrivv-gold-500/10 rounded-b-2xl">
          <p className="text-xs text-thrivv-text-muted text-center">
            🔒 Your data is private and secure. You can update these preferences anytime in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
