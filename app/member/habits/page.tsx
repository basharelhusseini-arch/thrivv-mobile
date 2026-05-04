'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, CheckCircle, Circle, Calendar, Target, TrendingUp } from 'lucide-react';
import { Habit, HabitEntry } from '@/types';
import PageHeader from '@/components/PageHeader';

export default function MemberHabitsPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const storedMemberId = localStorage.getItem('memberId');
    if (!storedMemberId) {
      router.push('/member/login');
      return;
    }
    setMemberId(storedMemberId);
    fetchHabits(storedMemberId);
    fetchEntries(storedMemberId);
  }, [router]);

  const fetchHabits = async (id: string) => {
    try {
      const response = await fetch(`/api/habits?memberId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setHabits(data);
      }
    } catch (error) {
      console.error('Failed to fetch habits:', error);
    }
  };

  const fetchEntries = async (id: string) => {
    try {
      const response = await fetch(`/api/habits/entries?memberId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabitEntry = async (habitId: string, date: string, completed: boolean) => {
    if (!memberId) return;

    try {
      // Check if entry exists
      const existingEntry = entries.find(e => e.habitId === habitId && e.date === date);
      
      if (existingEntry) {
        // Update existing entry
        const response = await fetch(`/api/habits/${habitId}/entries/${existingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed }),
        });
        if (response.ok) {
          fetchEntries(memberId);
        }
      } else {
        // Create new entry
        const response = await fetch(`/api/habits/${habitId}/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId,
            date,
            completed,
          }),
        });
        if (response.ok) {
          fetchEntries(memberId);
        }
      }
    } catch (error) {
      console.error('Failed to toggle habit entry:', error);
    }
  };

  const getEntryForDate = (habitId: string, date: string): HabitEntry | undefined => {
    return entries.find(e => e.habitId === habitId && e.date === date);
  };

  const getStreak = (habitId: string): number => {
    const habitEntries = entries.filter(e => e.habitId === habitId && e.completed).sort((a, b) => b.date.localeCompare(a.date));
    if (habitEntries.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < habitEntries.length; i++) {
      const entryDate = new Date(habitEntries[i].date);
      entryDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - streak);
      
      if (entryDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Target className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading habits
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Consistency"
        title="Habits"
        subtitle="Track daily habits and stack streaks that compound your Health Score."
        action={
          <Link
            href="/member/habits/new"
            className="btn-primary px-5 py-2.5 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Habit
          </Link>
        }
      />

      <main className="space-y-8">
        <div className="flex items-center justify-between">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-premium px-4 py-3"
          />
        </div>

        {habits.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <div className="icon-badge w-20 h-20 mx-auto mb-6">
              <Target className="w-10 h-10 text-thrivv-gold-500" />
            </div>
            <h3 className="text-2xl font-semibold text-thrivv-text-primary mb-2">No habits yet</h3>
            <p className="text-thrivv-text-secondary mb-8">Start tracking your habits to build consistency</p>
            <Link
              href="/member/habits/new"
              className="inline-flex items-center btn-primary px-6 py-3"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Habit
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.map((habit) => {
              const entry = getEntryForDate(habit.id, selectedDate);
              const streak = getStreak(habit.id);
              const isCompleted = entry?.completed || false;
              
              return (
                <div
                  key={habit.id}
                  className="premium-card p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-thrivv-text-primary">{habit.name}</h3>
                        <span className="text-xs px-3 py-1 bg-thrivv-gold-500/10 text-thrivv-gold-500 border border-thrivv-gold-500/20 rounded-lg capitalize">
                          {habit.category}
                        </span>
                      </div>
                      {habit.description && (
                        <p className="text-thrivv-text-secondary text-sm mb-3">{habit.description}</p>
                      )}
                      <div className="flex items-center space-x-6 text-sm text-thrivv-text-muted">
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1.5 text-thrivv-neon-green" />
                          {streak} day streak
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5 text-thrivv-gold-500" />
                          {habit.frequency === 'daily' ? 'Daily' : `${habit.frequency}`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleHabitEntry(habit.id, selectedDate, !isCompleted)}
                      className={`ml-6 p-4 rounded-xl transition-all duration-300 ${
                        isCompleted
                          ? 'bg-thrivv-neon-green/20 text-thrivv-neon-green hover:bg-thrivv-neon-green/30 border border-thrivv-neon-green/30 glow-green'
                          : 'bg-thrivv-bg-card/50 text-thrivv-text-muted hover:bg-thrivv-gold-500/10 hover:text-thrivv-gold-500 border border-thrivv-gold-500/10'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
