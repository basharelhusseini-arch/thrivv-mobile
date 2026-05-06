'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Dumbbell, UtensilsCrossed, Moon, CheckCircle, Loader2, Watch } from 'lucide-react';
import { getTodayLog, computeTotals } from '@/lib/nutrition-log';
import PageHeader from '@/components/PageHeader';
import {
  ensureWhoopAutoSync,
  type WhoopStatusSnapshot,
} from '@/lib/whoop/auto-sync';

interface CheckinForm {
  didWorkout: boolean;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  sleepHours: string;
  habits: {
    sauna: boolean;
    steamRoom: boolean;
    iceBath: boolean;
    coldShower: boolean;
    meditation: boolean;
    stretching: boolean;
  };
}

export default function CheckinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentScore, setCurrentScore] = useState<any>(null);
  const [whoopStatus, setWhoopStatus] = useState<WhoopStatusSnapshot | null>(null);

  const [formData, setFormData] = useState<CheckinForm>({
    didWorkout: false,
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    sleepHours: '',
    habits: {
      sauna: false,
      steamRoom: false,
      iceBath: false,
      coldShower: false,
      meditation: false,
      stretching: false,
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/member/login');
          return false;
        }
        return true;
      } catch (error) {
        router.push('/member/login');
        return false;
      }
    };

    const fetchTodayCheckin = async () => {
      try {
        const response = await fetch('/api/checkin/today');
        if (response.ok) {
          const data = await response.json();
          if (data.checkin) {
            setHasCheckedIn(true);
            const habitDetails = data.checkin.habit_details || {};
            setFormData({
              didWorkout: data.checkin.did_workout,
              calories: data.checkin.calories?.toString() || '',
              protein: '', // Keep UI fields but don't load from check-ins
              carbs: '',
              fat: '',
              sleepHours: data.checkin.sleep_hours?.toString() || '',
              habits: {
                sauna: habitDetails.sauna || false,
                steamRoom: habitDetails.steamRoom || false,
                iceBath: habitDetails.iceBath || false,
                coldShower: habitDetails.coldShower || false,
                meditation: habitDetails.meditation || false,
                stretching: habitDetails.stretching || false,
              },
            });
          }
        }

        // Also fetch current score
        const refetchScore = async () => {
          const r = await fetch('/api/score/today', { cache: 'no-store' });
          if (r.ok) {
            const d = await r.json();
            setCurrentScore(d.score);
          }
        };
        await refetchScore();

        // Auto-sync WHOOP for today (debounced per session). The
        // hook short-circuits when the user isn't connected.
        const status = await ensureWhoopAutoSync({
          onSynced: refetchScore,
        });
        setWhoopStatus(status);

        // IMPORTANT: Sync nutrition data to health score if meals are logged
        // This ensures nutrition counts toward reward points
        try {
          const memberId = localStorage.getItem('memberId');
          if (memberId) {
            // Get today's nutrition from localStorage
            const todayLog = await getTodayLog(memberId);
            
            if (todayLog.meals.length > 0) {
              const totals = computeTotals(todayLog);
              
              console.log('🔄 Syncing nutrition to health score:', totals);
              
              // Update health score with nutrition data
              const nutritionResponse = await fetch('/api/health/update-from-nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  memberId,
                  date: new Date().toISOString().split('T')[0],
                  totalCalories: totals.calories,
                  totalProtein: totals.protein_g,
                  totalCarbs: totals.carbs_g,
                  totalFat: totals.fat_g,
                  mealCount: totals.mealCount,
                }),
              });
              
              if (nutritionResponse.ok) {
                console.log('✅ Nutrition synced to health score successfully');
                // Refresh the score display
                const scoreResponse = await fetch('/api/score/today');
                if (scoreResponse.ok) {
                  const scoreData = await scoreResponse.json();
                  setCurrentScore(scoreData.score);
                }
              }
            }
          }
        } catch (err) {
          console.warn('Could not sync nutrition to health score:', err);
        }
      } catch (error) {
        console.error('Failed to fetch check-in:', error);
      } finally {
        setLoading(false);
      }
    };

    const initializePage = async () => {
      const isAuthenticated = await checkAuth();
      if (isAuthenticated) {
        await fetchTodayCheckin();
      }
    };

    initializePage();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Construct payload with only fields that exist in daily_checkins table
      const payload = {
        didWorkout: formData.didWorkout,
        calories: formData.calories ? parseInt(formData.calories, 10) : 0,
        sleepHours: formData.sleepHours ? parseFloat(formData.sleepHours) : 0,
        habits: formData.habits,
      };

      const response = await fetch('/api/checkin/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setCurrentScore(data.score);
        setHasCheckedIn(true);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/member/dashboard');
        }, 2000);
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          setError('Session expired. Please sign in again.');
          setTimeout(() => router.push('/member/login'), 2000);
        } else {
          const errorMsg = data.error || `Failed to save check-in (HTTP ${response.status})`;
          const codeMsg = data.code ? ` [Code: ${data.code}]` : '';
          setError(`${errorMsg}${codeMsg}`);
        }
        // Log full error for debugging
        console.error('Check-in failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          code: data.code,
          details: data.details,
          supabaseError: data.supabaseError
        });
      }
    } catch (error) {
      console.error('Check-in exception:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Loader2 className="w-5 h-5 text-thrivv-gold-500 animate-spin" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Preparing check-in
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Daily check-in"
        title="Daily Check-In"
        subtitle={
          hasCheckedIn
            ? 'Update today\u2019s progress to refresh your Health Score and leaderboard rank.'
            : 'Log workout, meals, and sleep to update your Health Score and leaderboard rank.'
        }
      />

      {/* Success Message */}
      {success && (
        <div className="glass-effect p-6 rounded-xl border-2 border-green-500/50 bg-green-500/10">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-lg font-semibold text-white">Check-in Complete!</p>
              <p className="text-gray-400">Your health score has been updated. Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      )}

      {/* WHOOP status — additive, only renders when connected. */}
      {whoopStatus?.connected && (
        <div className="dark-card p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center flex-shrink-0">
              <Watch className="w-5 h-5 text-thrivv-gold-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">WHOOP connected</p>
              <p className="text-xs text-gray-400 truncate">
                {whoopStatus.lastSyncedAt
                  ? `Last sync: ${new Date(whoopStatus.lastSyncedAt).toLocaleString()}`
                  : 'Syncing today…'}
              </p>
            </div>
          </div>
          {whoopStatus.latest && (
            <div className="hidden sm:flex gap-4 text-xs text-gray-300">
              {whoopStatus.latest.recoveryScore != null && (
                <div className="text-right">
                  <div className="text-gray-500 uppercase tracking-wider">Recovery</div>
                  <div className="text-white font-semibold">{whoopStatus.latest.recoveryScore}%</div>
                </div>
              )}
              {whoopStatus.latest.dayStrain != null && (
                <div className="text-right">
                  <div className="text-gray-500 uppercase tracking-wider">Strain</div>
                  <div className="text-white font-semibold">{whoopStatus.latest.dayStrain.toFixed(1)}</div>
                </div>
              )}
              {whoopStatus.latest.sleepEfficiencyPct != null && (
                <div className="text-right">
                  <div className="text-gray-500 uppercase tracking-wider">Sleep eff.</div>
                  <div className="text-white font-semibold">{whoopStatus.latest.sleepEfficiencyPct}%</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current Score */}
      {currentScore && (
        <div className="dark-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Today&apos;s Health Score</h3>
            {currentScore.score_source && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-thrivv-gold-500/80 border border-thrivv-gold-500/30 rounded-full px-2 py-0.5">
                {currentScore.score_source}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-5xl font-bold text-gradient">
                {currentScore.score}
              </div>
              <div className="text-sm text-gray-400 space-y-0.5">
                {currentScore.activity_points != null ? (
                  <>
                    <div>Activity: {Math.round(Number(currentScore.activity_points))}/50</div>
                    <div>Recovery + Sleep: {Math.round(Number(currentScore.recovery_sleep_points ?? 0))}/30</div>
                    <div>Food: {Math.round(Number(currentScore.food_points ?? 0))}/20</div>
                    <div>Habits: {Math.round(Number(currentScore.habit_points ?? 0))}/10</div>
                  </>
                ) : (
                  <>
                    <div>Training: {currentScore.training_score}/30</div>
                    <div>Diet: {currentScore.diet_score}/40</div>
                    <div>Sleep: {currentScore.sleep_score}/30</div>
                  </>
                )}
              </div>
            </div>
            <Activity className="w-12 h-12 text-yellow-400" />
          </div>
        </div>
      )}

      {/* Check-in Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="dark-card p-6 space-y-6">
          {/* Workout */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                formData.didWorkout 
                  ? 'bg-yellow-500 border-yellow-500' 
                  : 'border-gray-600 group-hover:border-yellow-400'
              }`}>
                {formData.didWorkout && <CheckCircle className="w-4 h-4 text-black" />}
              </div>
              <input
                type="checkbox"
                checked={formData.didWorkout}
                onChange={(e) => setFormData({ ...formData, didWorkout: e.target.checked })}
                className="sr-only"
              />
              <Dumbbell className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-medium">I worked out today</span>
            </label>
            <p className="text-sm text-gray-400 mt-2 ml-9">
              Any physical activity counts! (30 points)
            </p>
          </div>

          {/* Nutrition Tracking */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <UtensilsCrossed className="w-5 h-5 text-green-400" />
              <span>Nutrition Tracking (optional - helps maximize diet score)</span>
            </h3>
            
            {/* Calories */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Calories
              </label>
              <input
                type="number"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                placeholder="e.g., 2200"
                min="0"
                max="10000"
                className="w-full px-4 py-3 bg-black/50 border border-yellow-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
              />
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Protein */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={formData.protein}
                  onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                  placeholder="150"
                  min="0"
                  max="500"
                  step="0.1"
                  className="w-full px-3 py-3 bg-black/50 border border-yellow-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all text-sm"
                />
              </div>

              {/* Carbs */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={formData.carbs}
                  onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                  placeholder="200"
                  min="0"
                  max="1000"
                  step="0.1"
                  className="w-full px-3 py-3 bg-black/50 border border-yellow-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all text-sm"
                />
              </div>

              {/* Fat */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={formData.fat}
                  onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
                  placeholder="70"
                  min="0"
                  max="500"
                  step="0.1"
                  className="w-full px-3 py-3 bg-black/50 border border-yellow-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all text-sm"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400">
              <span className="font-medium">Tip:</span> Track macros for up to 15 bonus points! Perfect: 2200±300 cal, ~150g protein, ~200g carbs, ~70g fat
            </p>
          </div>

          {/* Sleep */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <Moon className="w-5 h-5 text-blue-400" />
                <span>Hours of Sleep (optional)</span>
              </div>
            </label>
            <input
              type="number"
              value={formData.sleepHours}
              onChange={(e) => setFormData({ ...formData, sleepHours: e.target.value })}
              placeholder="e.g., 7.5"
              min="0"
              max="24"
              step="0.5"
              className="w-full px-4 py-3 bg-black/50 border border-yellow-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
            />
            <p className="text-sm text-gray-400 mt-2">
              Optimal: 7-9 hours for full 30 points
            </p>
          </div>

          {/* Wellness Habits */}
          <div className="pt-4 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Wellness Habits (optional - earn up to 10 points!)
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              2+ habits = 10 points | 1 habit = 5 points
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Sauna */}
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  formData.habits.sauna 
                    ? 'bg-yellow-500 border-yellow-500' 
                    : 'border-gray-600 group-hover:border-yellow-400'
                }`}>
                  {formData.habits.sauna && <CheckCircle className="w-3 h-3 text-black" />}
                </div>
                <input
                  type="checkbox"
                  checked={formData.habits.sauna}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    habits: { ...formData.habits, sauna: e.target.checked }
                  })}
                  className="sr-only"
                />
                <span className="text-sm text-white">Sauna</span>
              </label>

              {/* Steam Room */}
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  formData.habits.steamRoom 
                    ? 'bg-yellow-500 border-yellow-500' 
                    : 'border-gray-600 group-hover:border-yellow-400'
                }`}>
                  {formData.habits.steamRoom && <CheckCircle className="w-3 h-3 text-black" />}
                </div>
                <input
                  type="checkbox"
                  checked={formData.habits.steamRoom}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    habits: { ...formData.habits, steamRoom: e.target.checked }
                  })}
                  className="sr-only"
                />
                <span className="text-sm text-white">Steam Room</span>
              </label>

              {/* Ice Bath */}
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  formData.habits.iceBath 
                    ? 'bg-yellow-500 border-yellow-500' 
                    : 'border-gray-600 group-hover:border-yellow-400'
                }`}>
                  {formData.habits.iceBath && <CheckCircle className="w-3 h-3 text-black" />}
                </div>
                <input
                  type="checkbox"
                  checked={formData.habits.iceBath}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    habits: { ...formData.habits, iceBath: e.target.checked }
                  })}
                  className="sr-only"
                />
                <span className="text-sm text-white">Ice Bath</span>
              </label>

              {/* Cold Shower */}
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  formData.habits.coldShower 
                    ? 'bg-yellow-500 border-yellow-500' 
                    : 'border-gray-600 group-hover:border-yellow-400'
                }`}>
                  {formData.habits.coldShower && <CheckCircle className="w-3 h-3 text-black" />}
                </div>
                <input
                  type="checkbox"
                  checked={formData.habits.coldShower}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    habits: { ...formData.habits, coldShower: e.target.checked }
                  })}
                  className="sr-only"
                />
                <span className="text-sm text-white">Cold Shower</span>
              </label>

              {/* Meditation */}
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  formData.habits.meditation 
                    ? 'bg-yellow-500 border-yellow-500' 
                    : 'border-gray-600 group-hover:border-yellow-400'
                }`}>
                  {formData.habits.meditation && <CheckCircle className="w-3 h-3 text-black" />}
                </div>
                <input
                  type="checkbox"
                  checked={formData.habits.meditation}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    habits: { ...formData.habits, meditation: e.target.checked }
                  })}
                  className="sr-only"
                />
                <span className="text-sm text-white">Meditation</span>
              </label>

              {/* Stretching */}
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  formData.habits.stretching 
                    ? 'bg-yellow-500 border-yellow-500' 
                    : 'border-gray-600 group-hover:border-yellow-400'
                }`}>
                  {formData.habits.stretching && <CheckCircle className="w-3 h-3 text-black" />}
                </div>
                <input
                  type="checkbox"
                  checked={formData.habits.stretching}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    habits: { ...formData.habits, stretching: e.target.checked }
                  })}
                  className="sr-only"
                />
                <span className="text-sm text-white">Stretching</span>
              </label>
            </div>
          </div>

        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || success}
          className="w-full btn-primary py-4 px-6 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Saved!</span>
            </>
          ) : (
            <span>{hasCheckedIn ? 'Update Check-In' : 'Complete Check-In'}</span>
          )}
        </button>
      </form>
    </div>
  );
}
