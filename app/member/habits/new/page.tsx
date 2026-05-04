'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Habit } from '@/types';
import PageHeader from '@/components/PageHeader';

export default function NewHabitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'health' as Habit['category'],
    frequency: 'daily' as Habit['frequency'],
    targetCount: 1,
    color: '#3b82f6',
    icon: '',
  });

  useEffect(() => {
    const storedMemberId = localStorage.getItem('memberId');
    if (!storedMemberId) {
      router.push('/member/login');
      return;
    }
    setMemberId(storedMemberId);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;

    setLoading(true);

    try {
      const habitData = {
        memberId,
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        frequency: formData.frequency,
        targetCount: formData.frequency === 'weekly' ? formData.targetCount : undefined,
        color: formData.color,
        icon: formData.icon || undefined,
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
        const error = await response.json();
        alert(error.error || 'Failed to create habit');
      }
    } catch (error) {
      alert('Failed to create habit');
    } finally {
      setLoading(false);
    }
  };

  const categories: Habit['category'][] = ['health', 'fitness', 'nutrition', 'recovery', 'sleep', 'productivity', 'other'];
  const frequencies: Habit['frequency'][] = ['daily', 'weekly', 'custom'];

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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="New habit"
        title="Add New Habit"
        subtitle="Create a habit to track and let it stack streaks toward your Health Score."
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

      <main className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="dark-card p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white border-b border-gray-800/50 pb-2">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Habit Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="e.g., Drink 8 glasses of water"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Add a description or motivation for this habit..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Habit['category'] })}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Frequency *</label>
                <select
                  required
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Habit['frequency'] })}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {frequencies.map(freq => (
                    <option key={freq} value={freq}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target Count (per week)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.targetCount}
                  onChange={(e) => setFormData({ ...formData, targetCount: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            )}
          </div>

          {/* Visual Customization */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white border-b border-gray-800/50 pb-2">Visual Customization</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {presetColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      formData.color === color ? 'border-white scale-110' : 'border-gray-700 hover:border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 bg-gray-800/50 border border-gray-700 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Icon Name (Optional)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="e.g., water, running, sleep"
              />
              <p className="text-xs text-gray-500 mt-1">Icon name for future icon system integration</p>
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
              disabled={loading}
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
