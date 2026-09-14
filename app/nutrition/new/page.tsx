'use client';
import { useClientSession } from '@/lib/client-session';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Target, User, Scale, Activity, Loader2 } from 'lucide-react';
import { NutritionPlan } from '@/types';

export default function GenerateNutritionPlanPage() {
  const { user } = useClientSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    memberId: '',
    goal: 'maintenance' as NutritionPlan['goal'],
    gender: 'male' as 'male' | 'female',
    age: 30,
    height: 170, // in cm
    weight: 70, // in kg
    activityLevel: 'moderate' as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
    duration: 7,
    dietaryRestrictions: [] as string[],
    preferences: [] as string[],
  });

  // Auto-populate memberId from localStorage
  useEffect(() => {
    const id = user?.id;
    if (id) {
      setMemberId(id);
      setFormData(prev => ({ ...prev, memberId: id }));
    }
  }, [user?.id]);

  const goals: { value: NutritionPlan['goal']; label: string; desc: string }[] = [
    { value: 'weight_loss', label: 'Weight Loss', desc: 'Calorie deficit for fat loss' },
    { value: 'muscle_gain', label: 'Muscle Gain', desc: 'Calorie surplus with high protein' },
    { value: 'maintenance', label: 'Maintenance', desc: 'Maintain current weight' },
    { value: 'performance', label: 'Performance', desc: 'Optimize athletic performance' },
    { value: 'general_health', label: 'General Health', desc: 'Balanced nutrition' },
  ];

  const activityLevels: { value: typeof formData.activityLevel; label: string }[] = [
    { value: 'sedentary', label: 'Sedentary (little to no exercise)' },
    { value: 'light', label: 'Light (exercise 1-3 days/week)' },
    { value: 'moderate', label: 'Moderate (exercise 3-5 days/week)' },
    { value: 'active', label: 'Active (exercise 6-7 days/week)' },
    { value: 'very_active', label: 'Very Active (intense exercise daily)' },
  ];

  const dietaryRestrictionOptions = [
    'vegetarian',
    'vegan',
    'gluten-free',
    'dairy-free',
    'nut-free',
    'keto',
    'paleo',
  ];

  const preferenceOptions = [
    'high-protein',
    'low-carb',
    'mediterranean',
    'low-fat',
    'high-fiber',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.memberId) {
      alert('Please log in to generate a nutrition plan');
      router.push('/member/login');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/nutrition-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      // Check for success field in response
      if (result.success === false) {
        // Only show error for truly invalid inputs
        alert(result.error + (result.details ? `\n\n${result.details}` : ''));
        setLoading(false);
        return;
      }

      // Success! Extract plan and warnings
      const plan = result.plan || result; // Support both new and old format
      const warnings = result.warnings;

      // Show friendly message if there are warnings
      if (warnings && warnings.length > 0) {
        console.warn('⚠️  Plan generated with adjustments:', warnings);
        
        // Show success message with minor adjustments note
        const warningMsg = warnings.length === 1 
          ? 'Plan generated with a minor adjustment.'
          : `Plan generated with ${warnings.length} minor adjustments.`;
        
        // Use a non-blocking toast if available, or brief alert
        if (typeof window !== 'undefined' && 'showToast' in window) {
          // @ts-ignore
          window.showToast(warningMsg, 'warning');
        } else {
          // Brief, non-alarming message
          setTimeout(() => {
            console.log('ℹ️ ', warningMsg);
          }, 100);
        }
      }

      // Navigate to the plan (success!)
      router.push(`/nutrition/${plan.id}`);
      
    } catch (error) {
      console.error('Failed to generate nutrition plan:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRestriction = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction],
    }));
  };

  const togglePreference = (preference: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: prev.preferences.includes(preference)
        ? prev.preferences.filter(p => p !== preference)
        : [...prev.preferences, preference],
    }));
  };

  return (
    <div className="min-h-screen bg-thrivv-bg-dark">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <Link
          href="/nutrition"
          className="inline-flex items-center text-thrivv-text-secondary hover:text-thrivv-gold-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Nutrition Plans
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="icon-badge">
            <Sparkles className="w-8 h-8 text-thrivv-gold-500" />
          </div>
          <div>
            <h1 className="text-4xl font-semibold text-thrivv-text-primary">
              Generate Nutrition Plan
            </h1>
            <p className="text-thrivv-text-secondary mt-1">
              AI-powered personalized meal planning
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="premium-card p-8 animate-slide-up">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Member ID */}
          {memberId && (
            <div>
              <label htmlFor="memberId" className="block text-sm font-medium text-thrivv-text-primary mb-2">
                Member ID
              </label>
              <input
                type="text"
                id="memberId"
                value={formData.memberId}
                className="input-premium bg-thrivv-bg-card/50 cursor-not-allowed"
                readOnly
                disabled
              />
              <p className="text-xs text-thrivv-text-muted mt-1">Auto-detected from your session</p>
            </div>
          )}

          {/* Goal Selection */}
          <div>
            <label htmlFor="goal" className="flex items-center text-sm font-medium text-thrivv-text-primary mb-3">
              <Target className="w-4 h-4 mr-2 text-thrivv-gold-500" />
              Fitness Goal <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {goals.map((goal) => (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, goal: goal.value })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    formData.goal === goal.value
                      ? 'border-thrivv-gold-500 bg-thrivv-gold-500/10'
                      : 'border-thrivv-gold-500/20 bg-thrivv-bg-card hover:border-thrivv-gold-500/40'
                  }`}
                >
                  <div className="font-semibold text-thrivv-text-primary">{goal.label}</div>
                  <div className="text-xs text-thrivv-text-muted mt-1">{goal.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="gender" className="flex items-center text-sm font-medium text-thrivv-text-primary mb-2">
                <User className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                Gender <span className="text-red-400 ml-1">*</span>
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                className="input-premium"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-medium text-thrivv-text-primary mb-2">
                Age <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                id="age"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                min="1"
                max="120"
                className="input-premium"
                required
              />
            </div>

            <div>
              <label htmlFor="height" className="flex items-center text-sm font-medium text-thrivv-text-primary mb-2">
                <Scale className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                Height (cm) <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="number"
                id="height"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })}
                min="50"
                max="250"
                className="input-premium"
                required
              />
            </div>

            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-thrivv-text-primary mb-2">
                Weight (kg) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                id="weight"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                min="20"
                max="300"
                step="0.1"
                className="input-premium"
                required
              />
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label htmlFor="activityLevel" className="flex items-center text-sm font-medium text-thrivv-text-primary mb-2">
              <Activity className="w-4 h-4 mr-2 text-thrivv-gold-500" />
              Activity Level <span className="text-red-400 ml-1">*</span>
            </label>
            <select
              id="activityLevel"
              value={formData.activityLevel}
              onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as typeof formData.activityLevel })}
              className="input-premium"
              required
            >
              {activityLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-thrivv-text-primary mb-2">
              Plan Duration (days) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              id="duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 7 })}
              min="1"
              max="90"
              className="input-premium"
              required
            />
            <p className="text-xs text-thrivv-text-muted mt-1">Recommended: 7-30 days</p>
          </div>

          {/* Dietary Restrictions */}
          <div>
            <label className="block text-sm font-medium text-thrivv-text-primary mb-3">
              Dietary Restrictions
            </label>
            <div className="flex flex-wrap gap-2">
              {dietaryRestrictionOptions.map((restriction) => (
                <button
                  key={restriction}
                  type="button"
                  onClick={() => toggleRestriction(restriction)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                    formData.dietaryRestrictions.includes(restriction)
                      ? 'border-thrivv-gold-500 bg-thrivv-gold-500/20 text-thrivv-gold-500'
                      : 'border-thrivv-gold-500/20 bg-thrivv-bg-card text-thrivv-text-secondary hover:border-thrivv-gold-500/40'
                  }`}
                >
                  {restriction.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div>
            <label className="block text-sm font-medium text-thrivv-text-primary mb-3">
              Nutrition Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {preferenceOptions.map((preference) => (
                <button
                  key={preference}
                  type="button"
                  onClick={() => togglePreference(preference)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                    formData.preferences.includes(preference)
                      ? 'border-thrivv-gold-500 bg-thrivv-gold-500/20 text-thrivv-gold-500'
                      : 'border-thrivv-gold-500/20 bg-thrivv-bg-card text-thrivv-text-secondary hover:border-thrivv-gold-500/40'
                  }`}
                >
                  {preference.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-thrivv-gold-500/10">
            <Link
              href="/nutrition"
              className="btn-ghost px-6 py-3"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-8 py-3 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Nutrition Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
