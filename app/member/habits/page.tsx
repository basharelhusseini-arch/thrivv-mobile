'use client';
import { useTranslation } from '@/lib/i18n/client';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, CheckCircle, Circle, Calendar, Target, TrendingUp, Loader2 } from 'lucide-react';
import { Habit, HabitEntry } from '@/types';
import PageHeader from '@/components/PageHeader';
import { useClientSession } from '@/lib/client-session';

export default function MemberHabitsPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const session = useClientSession();
  const memberId = session.user?.id;
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (session.status === 'unauthenticated') router.replace('/member/login');
  }, [session.status, router]);

  useEffect(() => {
    setHabits([]);
    setEntries([]);
    if (!memberId) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const responses = await Promise.all([
          fetch('/api/habits', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/habits/entries', { cache: 'no-store', signal: controller.signal }),
        ]);
        const [habitData, entryData] = await Promise.all(responses.map(response => response.json()));
        if (!responses[0].ok || !Array.isArray(habitData)) throw new Error(habitData.error || 'Your habits could not be loaded.');
        if (!responses[1].ok || !Array.isArray(entryData)) throw new Error(entryData.error || 'Your habit history could not be loaded.');
        setHabits(habitData);
        setEntries(entryData);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Your habits could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [memberId, retry]);

  const toggleHabitEntry = async (habitId: string, date: string, completed: boolean) => {
    if (!memberId || savingId) return;
    setSavingId(habitId);
    setError('');
    try {
      const existingEntry = entries.find(entry => entry.habitId === habitId && entry.date === date);
      const response = await fetch(existingEntry ? `/api/habits/${habitId}/entries/${existingEntry.id}` : `/api/habits/${habitId}/entries`, {
        method: existingEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingEntry ? { completed } : { date, completed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your habit could not be saved.');
      setEntries(previous => [...previous.filter(entry => entry.id !== data.id), data]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your habit could not be saved.');
    } finally {
      setSavingId(null);
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

  if (session.status === 'error') {
    return <div role="alert" className="premium-card p-6 space-y-3"><p>{t("We couldn&apos;t check your session.")}</p><button onClick={() => session.refresh()} className="btn-ghost px-4 py-2">{t("Try again")}</button></div>;
  }
  if (session.status === 'unauthenticated') return null;
  if (loading || session.status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Target className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">{t("Loading habits")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={t("Consistency")}
        title={t("Habits")}
        subtitle={t("Small daily actions. Steady progress.")}
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

      <div className="rounded-xl border border-thrivv-gold-500/15 bg-thrivv-gold-500/5 p-4 text-sm leading-relaxed text-thrivv-text-secondary">{t("Custom habit history is temporary. Use")}<Link href="/member/checkin" className="font-medium text-thrivv-gold-500 underline underline-offset-4">{t("Daily Check-in")}</Link>{t("for reward habits.")}</div>

      <main className="space-y-6">
        {error && <div role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200"><p>{t(error)}</p><button onClick={() => setRetry(value => value + 1)} className="mt-3 btn-ghost px-3 py-1.5">{t("Reload habits")}</button></div>}
        <div className="flex items-center justify-between">
          <input
            type="date"
            aria-label={t("Habit date")}
            max={new Date().toISOString().split('T')[0]}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-premium px-4 py-3"
          />
        </div>

        {!error && habits.length === 0 ? (
          <div className="premium-card p-8 text-center">
            <div className="icon-badge w-20 h-20 mx-auto mb-6">
              <Target className="w-10 h-10 text-thrivv-gold-500" />
            </div>
            <h3 className="text-2xl font-semibold text-thrivv-text-primary mb-2">{t("No habits yet")}</h3>
            <p className="text-thrivv-text-secondary mb-8">{t("Start tracking your habits to build consistency")}</p>
            <Link
              href="/member/habits/new"
              className="inline-flex items-center btn-primary px-6 py-3"
            >
              <Plus className="w-5 h-5 me-2" />{t("Add Your First Habit")}</Link>
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
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="break-words text-lg font-semibold text-thrivv-text-primary">{habit.name}</h3>
                        <span className="text-xs px-3 py-1 bg-thrivv-gold-500/10 text-thrivv-gold-500 border border-thrivv-gold-500/20 rounded-lg capitalize">
                          {habit.category}
                        </span>
                      </div>
                      {habit.description && (
                        <p className="text-thrivv-text-secondary text-sm mb-3">{habit.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-thrivv-text-muted">
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 me-1.5 text-thrivv-neon-green" />
                          {streak}{t("day streak")}</div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 me-1.5 text-thrivv-gold-500" />
                          {habit.frequency === 'daily' ? t("Daily") : `${habit.frequency}`}
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={savingId !== null}
                      aria-label={`${isCompleted ? 'Mark incomplete' : 'Complete'}: ${habit.name}`}
                      aria-pressed={isCompleted}
                      onClick={() => toggleHabitEntry(habit.id, selectedDate, !isCompleted)}
                      className={`ms-4 p-3 rounded-xl transition-colors disabled:opacity-50 ${
                        isCompleted
                          ? 'bg-thrivv-neon-green/20 text-thrivv-neon-green hover:bg-thrivv-neon-green/30 border border-thrivv-neon-green/30 glow-green'
                          : 'bg-thrivv-bg-card/50 text-thrivv-text-muted hover:bg-thrivv-gold-500/10 hover:text-thrivv-gold-500 border border-thrivv-gold-500/10'
                      }`}
                    >
                      {savingId === habit.id ? <Loader2 className="w-6 h-6 animate-spin" /> : isCompleted ? (
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
