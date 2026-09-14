'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Habit } from '@/types';
import PageHeader from '@/components/PageHeader';
import { useClientSession } from '@/lib/client-session';

export default function NewHabitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const session = useClientSession();
  const memberId = session.user?.id;
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'health' as Habit['category'],
    frequency: 'daily' as Habit['frequency'],
    targetCount: 1,
    color: '#f59e0b',
  });

  useEffect(() => {
    if (session.status === 'unauthenticated') router.replace('/member/login');
  }, [session.status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || loading) return;

    setLoading(true);
    setError('');

    try {
      const habitData = {
        name: formData.name.trim(),
        description: formData.description || undefined,
        category: formData.category,
        frequency: formData.frequency,
        targetCount: formData.frequency === 'weekly' ? formData.targetCount : undefined,
        color: formData.color,
        createdAt: new Date().toISOString(),
        status: 'active' as const,
      };

      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitData),
      });

      if (response.ok) {
        router.push('/member/habits');
      } else {
        const data = await response.json();
        setError(data.error || 'Your habit could not be saved. Please try again.');
      }
    } catch (error) {
      setError('Your habit could not be saved. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories: Habit['category'][] = ['health', 'fitness', 'nutrition', 'recovery', 'sleep', 'productivity', 'other'];
  const frequencies: Habit['frequency'][] = ['daily', 'weekly'];

  const presetColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // orange
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ];

  if (session.status === 'loading') return <div role="status" className="premium-card p-8 text-thrivv-text-secondary">Loading your account…</div>;
  if (session.status === 'error') return <div role="alert" className="premium-card p-6 space-y-3"><p>We couldn&apos;t check your session.</p><button onClick={() => session.refresh()} className="btn-ghost px-4 py-2">Try again</button></div>;
  if (session.status !== 'authenticated') return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="New habit"
        title="Build a habit."
        subtitle="Choose a small action you can come back to each day."
        action={
          <Link
            href="/member/habits"
            className="btn-ghost px-4 py-2 inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Habits
          </Link>
        }
      />

      <div className="rounded-xl border border-thrivv-gold-500/15 bg-thrivv-gold-500/5 p-4 text-sm leading-relaxed text-thrivv-text-secondary">
        Custom habit history is temporary. Use <Link href="/member/checkin" className="font-medium text-thrivv-gold-500 underline underline-offset-4">Daily Check-in</Link> for reward habits.
      </div>

      <main className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="premium-card p-6 space-y-6">
          {error && <p role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">{error}</p>}
          {/* Basic Information */}
          <div className="space-y-4">
            
            <div>
              <label htmlFor="habit-name" className="block text-sm font-medium text-gray-300 mb-2">Habit Name *</label>
              <input
                id="habit-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-thrivv-gold-500 focus:border-thrivv-gold-500 transition-all"
                placeholder="e.g., Drink 8 glasses of water"
              />
            </div>

            <div>
              <label htmlFor="habit-description" className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
              <textarea
                id="habit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-thrivv-gold-500 focus:border-thrivv-gold-500 transition-all"
                placeholder="Add a description or motivation for this habit..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="habit-category" className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                <select
                  id="habit-category"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Habit['category'] })}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-thrivv-gold-500 focus:border-thrivv-gold-500 transition-all"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="habit-frequency" className="block text-sm font-medium text-gray-300 mb-2">Frequency *</label>
                <select
                  id="habit-frequency"
                  required
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Habit['frequency'] })}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-thrivv-gold-500 focus:border-thrivv-gold-500 transition-all"
                >
                  {frequencies.map(freq => (
                    <option key={freq} value={freq}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.frequency === 'weekly' && (
              <div>
                <label htmlFor="habit-target" className="block text-sm font-medium text-gray-300 mb-2">Target Count (per week)</label>
                <input
                  id="habit-target"
                  type="number"
                  min="1"
                  max="7"
                  value={formData.targetCount}
                  onChange={(e) => setFormData({ ...formData, targetCount: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-thrivv-gold-500 focus:border-thrivv-gold-500 transition-all"
                />
              </div>
            )}
          </div>

          {/* Visual Customization */}
          <div className="space-y-4">
            
            <div>
              <label htmlFor="habit-color" className="block text-sm font-medium text-gray-300 mb-2">Color</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {presetColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Choose color ${color}`}
                    aria-pressed={formData.color === color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      formData.color === color ? 'border-white scale-110' : 'border-gray-700 hover:border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                id="habit-color"
                type="color"
                aria-label="Custom habit color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 bg-gray-800/50 border border-gray-700 rounded-lg cursor-pointer"
              />
            </div>

          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-800/50">
            <Link
              href="/member/habits"
              className="px-6 py-2 bg-gray-800/50 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors border border-gray-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="px-6 py-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Habit'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
