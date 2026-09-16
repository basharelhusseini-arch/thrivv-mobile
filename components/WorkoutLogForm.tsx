'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { exercisesDatabase } from '@/lib/exercises';
import type { LoggedWorkout } from '@/lib/manual-workouts';
import WorkoutCoachingTips from '@/components/WorkoutCoachingTips';

type MovementDraft = { key: number; name: string; sets: string; reps: string };
type WorkoutDraft = { name: string; date: string; exercises: MovementDraft[] };

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function findExercise(name: string) {
  return exercisesDatabase.find(exercise => exercise.name.toLowerCase() === name.trim().toLowerCase());
}

function restoreDraft(value: string | null): WorkoutDraft | null {
  if (!value) return null;
  const draft = JSON.parse(value);
  if (!draft || typeof draft.name !== 'string' || typeof draft.date !== 'string' ||
      !Array.isArray(draft.exercises) || !draft.exercises.length || draft.exercises.length > 30 ||
      !draft.exercises.every((row: MovementDraft) => row && typeof row.name === 'string' &&
        typeof row.sets === 'string' && typeof row.reps === 'string')) return null;
  return { name: draft.name.slice(0, 80), date: draft.date, exercises: draft.exercises.map((row: MovementDraft, key: number) => ({
    key, name: row.name.slice(0, 100), sets: row.sets, reps: row.reps,
  })) };
}

const inputClass = 'w-full min-w-0 rounded-lg border border-white/15 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-thrivv-gold-500 disabled:opacity-60';

export default function WorkoutLogForm({ memberId, onSaved }: { memberId: string; onSaved: (workout: LoggedWorkout) => void }) {
  const [draft, setDraft] = useState<WorkoutDraft>({ name: '', date: '', exercises: [{ key: 0, name: '', sets: '', reps: '' }] });
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const nextKey = useRef(1);
  const submitting = useRef(false);
  const request = useRef<AbortController | null>(null);
  const storageKey = `thrivv:workout-log-draft:${memberId}`;

  useEffect(() => {
    let restored: WorkoutDraft | null = null;
    try { restored = restoreDraft(localStorage.getItem(storageKey)); } catch { /* Storage can be unavailable. */ }
    setDraft(restored || { name: '', date: today(), exercises: [{ key: 0, name: '', sets: '', reps: '' }] });
    nextKey.current = restored?.exercises.length || 1;
    setDirty(!!restored);
    setReady(true);
    return () => request.current?.abort();
  }, [storageKey]);

  useEffect(() => {
    if (!ready || !dirty || saved) return;
    try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch { /* Logging still works without draft storage. */ }
  }, [draft, dirty, ready, saved, storageKey]);

  useEffect(() => {
    if (!dirty || saved) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, saved]);

  function update(updates: Partial<WorkoutDraft>) {
    setDraft(current => ({ ...current, ...updates }));
    setDirty(true);
    setError('');
  }

  function updateMovement(key: number, updates: Partial<MovementDraft>) {
    update({ exercises: draft.exercises.map(row => row.key === key ? { ...row, ...updates } : row) });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || saved) return;
    if (!draft.name.trim() || !draft.date || draft.exercises.some(row => !row.name.trim() ||
      !Number.isInteger(Number(row.sets)) || Number(row.sets) < 1 || Number(row.sets) > 100 ||
      !Number.isInteger(Number(row.reps)) || Number(row.reps) < 1 || Number(row.reps) > 1000)) {
      setError('Add a workout name, date, and valid sets and reps for every movement.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError('');
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/workouts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          expectedUserId: memberId,
          name: draft.name.trim(), date: draft.date,
          exercises: draft.exercises.map(row => ({
            name: row.name.trim(), exerciseId: findExercise(row.name)?.id,
            sets: Number(row.sets), reps: Number(row.reps),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save this workout. Please retry.');
      if (!data.workout?.id) throw new Error('Unable to confirm this workout was saved. Check your workout history before retrying.');
      if (controller.signal.aborted) return;
      try { localStorage.removeItem(storageKey); } catch { /* The workout is saved on the server. */ }
      setSaved(true);
      setDirty(false);
      window.dispatchEvent(new Event('thrivv:workouts-synced'));
      onSaved(data.workout);
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== 'AbortError' ? failure.message :
        'The save could not be confirmed. Your entries are still here. Check your workout history before retrying.');
    } finally {
      clearTimeout(timeout);
      submitting.current = false;
      setSaving(false);
    }
  }

  if (!ready) return <p role="status" className="text-sm text-thrivv-text-secondary">Loading workout...</p>;

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={saving || saved} className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)]">
          <label className="min-w-0 space-y-2 text-sm text-thrivv-text-secondary">
            <span className="block">Workout name</span>
            <input className={inputClass} value={draft.name} onChange={event => update({ name: event.target.value })} placeholder="e.g. Upper body" maxLength={80} required />
          </label>
          <label className="min-w-0 space-y-2 text-sm text-thrivv-text-secondary">
            <span className="block">Workout date</span>
            <input type="date" className={inputClass} value={draft.date} max={today()} onChange={event => update({ date: event.target.value })} required />
          </label>
        </div>

        <datalist id="workout-movements">{exercisesDatabase.map(exercise => <option key={exercise.id} value={exercise.name} />)}</datalist>
        <div className="space-y-4">
          {draft.exercises.map((row, index) => (
            <section key={row.key} aria-label={`Movement ${index + 1}`} className="rounded-lg border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">Movement {index + 1}</h2>
                <button type="button" title="Remove movement" aria-label={`Remove movement ${index + 1}`} disabled={draft.exercises.length === 1} onClick={() => update({ exercises: draft.exercises.filter(movement => movement.key !== row.key) })} className="rounded-lg p-2 text-thrivv-text-muted hover:bg-white/5 hover:text-red-300 disabled:opacity-30">
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_90px_110px]">
                <label className="col-span-2 min-w-0 space-y-2 text-sm text-thrivv-text-secondary sm:col-span-1">
                  <span className="block">Movement</span>
                  <input list="workout-movements" autoComplete="off" className={inputClass} value={row.name} onChange={event => updateMovement(row.key, { name: event.target.value })} placeholder="Search or enter a movement" maxLength={100} required />
                </label>
                <label className="min-w-0 space-y-2 text-sm text-thrivv-text-secondary">
                  <span className="block">Sets</span>
                  <input type="number" inputMode="numeric" min={1} max={100} step={1} className={inputClass} value={row.sets} onChange={event => updateMovement(row.key, { sets: event.target.value })} required />
                </label>
                <label className="min-w-0 space-y-2 text-sm text-thrivv-text-secondary">
                  <span className="block">Reps per set</span>
                  <input type="number" inputMode="numeric" min={1} max={1000} step={1} className={inputClass} value={row.reps} onChange={event => updateMovement(row.key, { reps: event.target.value })} required />
                </label>
              </div>
              {row.name.trim() && <WorkoutCoachingTips exerciseId={findExercise(row.name)?.id} />}
            </section>
          ))}
        </div>
        <button type="button" disabled={draft.exercises.length >= 30} onClick={() => update({ exercises: [...draft.exercises, { key: nextKey.current++, name: '', sets: '', reps: '' }] })} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm text-white hover:border-thrivv-gold-500/50 disabled:opacity-40">
          <Plus size={17} />Add movement
        </button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-400">Workout saved.</p>}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
        <p className="text-xs text-thrivv-text-muted">Workout log only. Gym verification and reward points are separate.</p>
        <button type="submit" disabled={saving || saved} className="btn-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm disabled:opacity-60 sm:w-auto">
          {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save workout'}
        </button>
      </div>
    </form>
  );
}
