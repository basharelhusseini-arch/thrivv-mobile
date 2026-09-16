'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Dumbbell } from 'lucide-react';
import WorkoutCoachingTips from '@/components/WorkoutCoachingTips';
import WorkoutDeleteButton from '@/components/WorkoutDeleteButton';
import type { LoggedWorkout } from '@/lib/manual-workouts';

type HistoryState = {
  memberId: string;
  workouts: LoggedWorkout[];
  loading: boolean;
  error: string;
};

function formatWorkoutDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

export default function LoggedWorkoutHistory({ memberId }: { memberId: string }) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<HistoryState>({ memberId, workouts: [], loading: true, error: '' });
  const [deletionNotice, setDeletionNotice] = useState<{ memberId: string; count: number } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { setDeletionNotice(null); }, [memberId]);
  useEffect(() => {
    if (deletionNotice?.memberId === memberId) heading.current?.focus();
  }, [deletionNotice, memberId]);

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('thrivv:workouts-synced', refresh);
    return () => window.removeEventListener('thrivv:workouts-synced', refresh);
  }, []);

  useEffect(() => {
    if (!memberId) return;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setState(previous => ({ memberId, workouts: previous.memberId === memberId ? previous.workouts : [], loading: true, error: '' }));

    async function load() {
      try {
        const response = await fetch(`/api/workouts/log?expectedUserId=${encodeURIComponent(memberId)}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load your logged workouts. Please try again.');
        const result = await response.json();
        if (!Array.isArray(result.workouts)) throw new Error('Unable to load your logged workouts. Please try again.');
        if (active) setState({ memberId, workouts: result.workouts, loading: false, error: '' });
      } catch {
        if (active) setState(previous => ({ ...previous, loading: false, error: 'Unable to load your logged workouts. Please try again.' }));
      } finally {
        clearTimeout(timeout);
      }
    }

    void load();
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [memberId, revision]);

  if (!memberId) return null;
  const current = state.memberId === memberId ? state : { workouts: [], loading: true, error: '' };

  return <section id="workout-log" aria-label="Logged workouts" aria-busy={current.loading} className="space-y-4">
    <div className="flex items-center gap-2.5">
      <Dumbbell size={18} aria-hidden="true" className="shrink-0 text-thrivv-gold-400" />
      <h2 ref={heading} tabIndex={-1} className="font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-thrivv-gold-400">Logged workouts</h2>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {deletionNotice?.memberId === memberId ? <span key={deletionNotice.count}>Logged workout deleted.</span> : null}
    </p>
    {current.loading && !current.workouts.length && <p role="status" className="py-5 text-sm text-thrivv-text-secondary">Loading logged workouts...</p>}
    {current.error && <p role="alert" className="text-sm text-amber-200">
      {current.error}{' '}
      <button type="button" onClick={() => setRevision(value => value + 1)} className="underline underline-offset-4">Retry</button>
    </p>}
    {!current.loading && !current.error && !current.workouts.length && <p className="py-5 text-sm text-thrivv-text-secondary">No workouts logged yet.</p>}
    <div className="space-y-3">
      {current.workouts.map(workout => <details key={workout.id} className="group rounded-lg border border-white/10 bg-white/[0.025]">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-thrivv-gold-400 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-sm font-medium text-white">{workout.name}</h3>
            <p className="mt-1 text-xs text-thrivv-text-muted"><time dateTime={workout.date}>{formatWorkoutDate(workout.date)}</time>{' / '}{workout.exercises.length} {workout.exercises.length === 1 ? 'movement' : 'movements'}</p>
          </div>
          <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-thrivv-text-secondary transition-transform group-open:rotate-180" />
        </summary>
        <ol className="border-t border-white/10 px-4">
          {workout.exercises.map((exercise, index) => <li key={`${workout.id}-${index}`} className="border-b border-white/10 py-4 last:border-b-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h4 className="min-w-0 max-w-full break-words text-sm font-medium text-white">{exercise.name}</h4>
              <p className="shrink-0 text-sm text-thrivv-gold-400">{exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'} x {exercise.reps} {exercise.reps === 1 ? 'rep' : 'reps'}</p>
            </div>
            <WorkoutCoachingTips exerciseId={exercise.exerciseId} />
          </li>)}
        </ol>
        <div className="flex justify-end border-t border-white/10 px-4 py-3">
          <WorkoutDeleteButton kind="workout" id={workout.id} memberId={memberId} name={workout.name}
            onDeleted={() => {
              setState(previous => previous.memberId === memberId
                ? { ...previous, workouts: previous.workouts.filter(item => item.id !== workout.id) }
                : previous);
              setDeletionNotice(previous => ({ memberId, count: (previous?.count || 0) + 1 }));
            }} />
        </div>
      </details>)}
    </div>
  </section>;
}
