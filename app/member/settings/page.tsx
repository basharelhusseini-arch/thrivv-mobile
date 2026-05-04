'use client';

/**
 * USER SETTINGS PAGE
 * 
 * Allows users to update:
 * - Health goals
 * - Wearable preferences
 * - Privacy settings
 */

import { useState, useEffect } from 'react';
import { Settings, Target, Activity, Bell, Shield } from 'lucide-react';
import { HealthGoal, WearableType } from '@/types';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import PageHeader from '@/components/PageHeader';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [goal, setGoal] = useState<HealthGoal>('general');
  const [hasWearable, setHasWearable] = useState(false);
  const [wearableType, setWearableType] = useState<WearableType>(null);
  const [confidenceScore, setConfidenceScore] = useState(30);
  const [confidenceLevel, setConfidenceLevel] = useState<'low' | 'medium' | 'high'>('low');

  useEffect(() => {
    const id = localStorage.getItem('memberId');
    setUserId(id);
    
    if (id) {
      fetchProfile(id);
      fetchConfidenceScore(id);
    }
  }, []);

  const fetchProfile = async (id: string) => {
    try {
      const response = await fetch('/api/health/profile', {
        headers: { 'x-user-id': id },
      });
      
      const data = await response.json();
      
      if (data.profile) {
        setGoal(data.profile.goal);
        setHasWearable(data.profile.has_wearable);
        setWearableType(data.profile.wearable_type);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfidenceScore = async (id: string) => {
    try {
      const response = await fetch('/api/health/confidence-score', {
        headers: { 'x-user-id': id },
      });
      
      const data = await response.json();
      setConfidenceScore(data.confidence_score);
      setConfidenceLevel(data.confidence_level);
    } catch (error) {
      console.error('Failed to fetch confidence score:', error);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    
    setSaving(true);
    
    try {
      const response = await fetch('/api/health/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          goal,
          has_wearable: hasWearable,
          wearable_type: wearableType,
        }),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
        fetchConfidenceScore(userId); // Refresh confidence score
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
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
    <div className="space-y-10">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Tune your goal, wearable, and data confidence."
      />

      <div className="max-w-4xl space-y-6">
        {/* Confidence Score Card */}
        <div className="premium-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-thrivv-text-primary flex items-center gap-2">
                <Shield className="w-5 h-5 text-thrivv-gold-500" />
                Data Confidence
              </h2>
              <p className="text-sm text-thrivv-text-secondary mt-1">
                Shows how complete and verified your data is
              </p>
            </div>
            <ConfidenceBadge level={confidenceLevel} score={confidenceScore} showScore />
          </div>
          
          <div className="mt-4 p-4 bg-thrivv-bg-dark rounded-lg">
            <p className="text-xs text-thrivv-text-muted">
              💡 <span className="font-semibold">Remember:</span> Your Health Score (0-100) reflects your behavior and is NEVER reduced by confidence level. Confidence is purely informational.
            </p>
          </div>
        </div>

        {/* Goal Settings */}
        <div className="premium-card p-6">
          <h2 className="text-lg font-semibold text-thrivv-text-primary flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-thrivv-gold-500" />
            Health Goal
          </h2>
          
          <select
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
        <div className="premium-card p-6">
          <h2 className="text-lg font-semibold text-thrivv-text-primary flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-thrivv-gold-500" />
            Wearable Device
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
                I use a fitness wearable
              </label>
            </div>

            {hasWearable && (
              <div className="animate-slide-up">
                <label className="block text-sm font-medium text-thrivv-text-primary mb-2">
                  Wearable Type
                </label>
                <select
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
              Wearables improve data accuracy and confidence score, but are completely optional. Manual logging is always valued.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-8 py-3"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
