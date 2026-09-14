'use client';

/**
 * USER SETTINGS PAGE
 *
 * Allows users to update:
 * - Health goals
 * - Wearable preferences
 */

import { useState, useEffect } from 'react';
import { Settings, Target, Activity } from 'lucide-react';
import { HealthGoal, WearableType } from '@/types';
import { useClientSession } from '@/lib/client-session';

export default function AccountPreferences() {
  const session = useClientSession();
  const [feedback, setFeedback] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const userId = session.user?.id;

  const [goal, setGoal] = useState<HealthGoal>('general');
  const [hasWearable, setHasWearable] = useState(false);
  const [wearableType, setWearableType] = useState<WearableType>(null);
  useEffect(() => {
    if (userId) { fetchProfile(userId); }
  }, [userId]);

  const fetchProfile = async (id: string) => {
    try {
      const response = await fetch('/api/health/profile', { cache: 'no-store' });

      if (!response.ok) throw new Error('Unable to load preferences');
      const data = await response.json();

      setLoadError(false);
      setFeedback('');
      if (data.profile) {
        setGoal(data.profile.goal);
        setHasWearable(data.profile.has_wearable);
        setWearableType(data.profile.wearable_type);
      }
    } catch (error) {
      setLoadError(true);
      setFeedback('Preferences could not be loaded. Please retry before making changes.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || loadError) return;

    setSaving(true);

    try {
      const response = await fetch('/api/health/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal,
          has_wearable: hasWearable,
          wearable_type: wearableType,
        }),
      });

      if (response.ok) {
        setFeedback('Preferences saved.');
      } else {
        setFeedback('Unable to save preferences. Please retry.');
      }
    } catch (error) {
      console.error('Save error:', error);
      setFeedback('Unable to save preferences. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  if (session.status === 'error') return <p role="alert">Preferences unavailable. <button className="underline" onClick={() => session.refresh()}>Retry</button></p>;

  if (loading) {
    return (
      <div className="min-h-[120px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Settings className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading settings
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback && <p role="status" className="text-sm text-thrivv-gold-400">{feedback} {loadError && userId && <button className="underline" onClick={() => fetchProfile(userId)}>Retry</button>}</p>}
      <div className="space-y-4">
        {/* Goal Settings */}
        <div className="rounded-xl border border-white/10 p-4">
          <h2 className="text-lg font-semibold text-thrivv-text-primary flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-thrivv-gold-500" />
            Health Goal
          </h2>

          <select
            aria-label="Health goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value as HealthGoal)}
            className="input-premium w-full"
          >
            <option value="fat_loss">Fat Loss</option>
            <option value="muscle_gain">Muscle Gain</option>
            <option value="performance">Performance</option>
            <option value="maintenance">Maintenance</option>
            <option value="general">General Health</option>
          </select>
        </div>

        {/* Wearable Settings */}
        <div className="rounded-xl border border-white/10 p-4">
          <h2 className="text-lg font-semibold text-thrivv-text-primary flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-thrivv-gold-500" />
            Device preference
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="has-wearable"
                checked={hasWearable}
                onChange={(e) => setHasWearable(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="has-wearable" className="text-sm text-thrivv-text-primary">
                I own a fitness wearable
              </label>
            </div>

            {hasWearable && (
              <div className="animate-slide-up">
                <label className="block text-sm font-medium text-thrivv-text-primary mb-2">
                  Device type
                </label>
                <select
                  aria-label="Device type"
                  value={wearableType || ''}
                  onChange={(e) => setWearableType((e.target.value as WearableType) || null)}
                  className="input-premium w-full"
                >
                  <option value="">Select device</option>
                  <option value="whoop">WHOOP</option>
                  <option value="garmin">Garmin</option>
                  <option value="apple_watch">Apple Watch</option>
                  <option value="fitbit">Fitbit</option>
                  <option value="oura">Oura Ring</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}

            <p className="text-xs text-thrivv-text-muted">
              This preference does not connect a device or change workout verification. Manage your actual connection in Wearables.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loadError}
            className="btn-primary px-8 py-3"
          >
            {saving ? 'Saving...' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
