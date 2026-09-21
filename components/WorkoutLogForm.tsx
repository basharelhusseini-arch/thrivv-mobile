'use client';
import { useTranslation } from '@/lib/i18n/client';


import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { exercisesDatabase } from '@/lib/exercises';
import type { LoggedWorkout } from '@/lib/manual-workouts';
import {useWorkoutProgress} from '@/lib/use-workout-progress';
import { enqueueWorkout } from '@/lib/workout-upload-queue';
import { parseManualWorkoutInput } from '@/lib/manual-workouts';
import WorkoutRestTimer from '@/components/WorkoutRestTimer';
import WorkoutCoachingTips from '@/components/WorkoutCoachingTips';

type MovementDraft = { key: number; name: string; sets: string; reps: string; setDetails?: { reps: string; weightKg: string }[] };
type WorkoutDraft = { requestId?: string; name: string; date: string; exercises: MovementDraft[] };

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
  return { requestId: typeof draft.requestId === 'string' ? draft.requestId : undefined, name: draft.name.slice(0, 80), date: draft.date, exercises: draft.exercises.map((row: MovementDraft, key: number) => ({
    key, name: row.name.slice(0, 100), sets: row.sets, reps: row.reps,
    ...(Array.isArray(row.setDetails) && row.setDetails.length <= 100 && row.setDetails.every(s => typeof s?.reps === 'string' && typeof s?.weightKg === 'string') ? {setDetails: row.setDetails} : {}),
  })) };
}

const inputClass = 'w-full min-w-0 rounded-lg border border-white/15 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-thrivv-gold-500 disabled:opacity-60';

export default function WorkoutLogForm({ memberId, onSaved, initialWorkout }: { memberId: string; onSaved: (workout?: LoggedWorkout) => void; initialWorkout?: LoggedWorkout }) {
  const { t, locale } = useTranslation();
  const [draft, setDraft] = useState<WorkoutDraft>({ name: '', date: '', exercises: [{ key: 0, name: '', sets: '', reps: '' }] });
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncState, setSyncState] = useState('');
  const {progress:previous,error:previousError} = useWorkoutProgress(memberId,0,draft.date,initialWorkout?.id);
  const [error, setError] = useState('');
  const nextKey = useRef(1);
  const submitting = useRef(false);
  const request = useRef<AbortController | null>(null);
  const storageKey = `thrivv:workout-log-draft:${memberId}${initialWorkout ? `:edit:${initialWorkout.id}` : ''}`;

  useEffect(() => {
    let restored: WorkoutDraft | null = null;
    try { restored = restoreDraft(localStorage.getItem(storageKey)); } catch { /* Storage can be unavailable. */ }
    if (!restored && initialWorkout) restored = {name:initialWorkout.name,date:initialWorkout.date,exercises:initialWorkout.exercises.map((e,key)=>({key,name:e.name,sets:String(e.sets),reps:String(e.reps),...(e.setDetails && {setDetails:e.setDetails.map(s=>({reps:String(s.reps),weightKg:s.weightKg===null?'':String(s.weightKg)}))})}))};
    setDraft(restored ? {...restored, requestId: restored.requestId && /^[a-f0-9-]{36}$/i.test(restored.requestId) ? restored.requestId : crypto.randomUUID()} : { requestId: crypto.randomUUID(), name: '', date: today(), exercises: [{ key: 0, name: '', sets: '', reps: '' }] });
    nextKey.current = restored?.exercises.length || 1;
    setDirty(!!restored);
    setReady(true);
    return () => request.current?.abort();
  }, [storageKey, initialWorkout]);

  useEffect(() => {
    if (!ready || !dirty || saved) return;
    try { localStorage.setItem(storageKey, JSON.stringify(draft)); setSyncState('Saved on this device'); } catch { setSyncState('Not saved on this device — storage unavailable'); }
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
    try {
      const input = parseManualWorkoutInput({
        name:draft.name.trim(),date:draft.date,exercises:draft.exercises.map(row=>({
          name:row.name.trim(),exerciseId:findExercise(row.name)?.id,sets:Number(row.sets),reps:Number(row.reps),
          ...(row.setDetails && {setDetails:row.setDetails.map(set=>({reps:Number(set.reps),weightKg:set.weightKg.trim()===''?null:Number(set.weightKg)}))}),
        })),
      });
      if(initialWorkout) {
        if(!navigator.onLine) throw new Error('Connect to the internet to update this saved workout. Your edits remain on this device.');
        const response=await fetch(`/api/workouts/log/${encodeURIComponent(initialWorkout.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,expectedUserId:memberId}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});
        const data=await response.json();if(!response.ok||!data.workout?.id) throw new Error(data.error||'Unable to confirm your changes. Retry safely.');
        setSyncState('Synced');
      } else {
        enqueueWorkout({...input,expectedUserId:memberId,requestId:draft.requestId!});
        setSyncState('Saved on this device · waiting to sync');
      }
      try {localStorage.removeItem(storageKey);} catch { /* Durable upload/server save already exists. */ }
      setSaved(true);setDirty(false);
      window.dispatchEvent(new Event('thrivv:workouts-synced'));
      onSaved();
    } catch(failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save. Keep this workout open and retry.');
    } finally { submitting.current=false;setSaving(false); }
  }

  if (!ready) return <p role="status" className="text-sm text-thrivv-text-secondary">{t("Loading workout...")}</p>;

  return (
    <form onSubmit={submit} className="space-y-6">
      <WorkoutRestTimer />
      {previousError && <p className="text-xs text-thrivv-text-muted">{t("Previous weights are temporarily unavailable.")}</p>}
      {syncState && <p role="status" className="text-sm text-thrivv-text-secondary">{syncState}</p>}
      <fieldset disabled={saving || saved} className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)]">
          <label className="min-w-0 space-y-2 text-sm text-thrivv-text-secondary">
            <span className="block">{t("Workout name")}</span>
            <input className={inputClass} value={draft.name} onChange={event => update({ name: event.target.value })} placeholder={t("e.g. Upper body")} maxLength={80} required />
          </label>
          <label className="min-w-0 space-y-2 text-sm text-thrivv-text-secondary">
            <span className="block">{t("Workout date")}</span>
            <input type="date" className={inputClass} value={draft.date} max={today()} onChange={event => update({ date: event.target.value })} required />
          </label>
        </div>

        <datalist id="workout-movements">{exercisesDatabase.map(exercise => <option key={exercise.id} value={exercise.name} />)}</datalist>
        <div className="space-y-4">
          {draft.exercises.map((row, index) => (
            <section key={row.key} aria-label={t("Movement {0}", { 0: index + 1 })} className="rounded-lg border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">{t("Movement")} {index + 1}</h2>
                <button type="button" title={t("Remove movement")} aria-label={t("Remove movement {0}", { 0: index + 1 })} disabled={draft.exercises.length === 1} onClick={() => update({ exercises: draft.exercises.filter(movement => movement.key !== row.key) })} className="rounded-lg p-2 text-thrivv-text-muted hover:bg-white/5 hover:text-red-300 disabled:opacity-30">
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_90px_110px]">
                <label className="col-span-2 min-w-0 space-y-2 text-sm text-thrivv-text-secondary sm:col-span-1">
                  <span className="block">{t("Movement")}</span>
                  <input list="workout-movements" autoComplete="off" className={inputClass} value={row.name} onChange={event => updateMovement(row.key, { name: event.target.value })} placeholder={t("Search or enter a movement")} maxLength={100} required />
                </label>
                <label className="min-w-0 space-y-2 text-sm text-thrivv-text-secondary">
                  <span className="block">{t("Sets")}</span>
                  <input type="number" inputMode="numeric" min={1} max={100} step={1} className={inputClass} value={row.sets} onChange={event => updateMovement(row.key, { sets: event.target.value, ...(row.setDetails ? {setDetails: Array.from({length: Math.min(100, Math.max(0, Number(event.target.value) || 0))}, (_,i) => row.setDetails?.[i] || {reps: row.reps, weightKg: ''})} : {}) })} required />
                </label>
                <label className="min-w-0 space-y-2 text-sm text-thrivv-text-secondary">
                  <span className="block">{t("Reps per set")}</span>
                  <input type="number" inputMode="numeric" min={1} max={1000} step={1} className={inputClass} value={row.reps} onChange={event => updateMovement(row.key, { reps: event.target.value })} required />
                </label>
              </div>
              {previous.filter(p=>p.name.trim().toLowerCase()===row.name.trim().toLowerCase()).map(p=><p key={p.name} className="mt-3 text-xs text-thrivv-gold-400">{t("Previous recorded weight:")} {p.latestKg} {t("kg ·")} {p.date}</p>)}
              <button type="button" className="mt-4 text-sm text-thrivv-gold-400 underline" disabled={!Number.isInteger(Number(row.sets)) || Number(row.sets)<1 || Number(row.sets)>100} onClick={() => updateMovement(row.key, {setDetails: row.setDetails ? undefined : Array.from({length: Number(row.sets)}, () => ({reps: row.reps, weightKg: ''}))})}>{row.setDetails ? t("Use simple sets and reps") : t("Add weights / customize each set")}</button>
              {row.setDetails && <div className="mt-3 space-y-2">{row.setDetails.map((set, setIndex) => <div key={setIndex} className="grid grid-cols-[40px_1fr_1fr] items-end gap-2"><span className="pb-3 text-xs">{t("Set")} {setIndex+1}</span><label className="text-xs">{t("Reps")}<input type="number" min={1} max={1000} required value={set.reps} className={inputClass} onChange={e => updateMovement(row.key,{setDetails:row.setDetails!.map((s,i)=>i===setIndex?{...s,reps:e.target.value}:s)})} /></label><label className="text-xs">{t("Weight (kg)")}<input type="number" min={0} max={1500} step="0.1" placeholder={t("Optional")} value={set.weightKg} className={inputClass} onChange={e => updateMovement(row.key,{setDetails:row.setDetails!.map((s,i)=>i===setIndex?{...s,weightKg:e.target.value}:s)})} /></label></div>)}</div>}
              {row.name.trim() && <WorkoutCoachingTips exerciseId={findExercise(row.name)?.id} />}
            </section>
          ))}
        </div>
        <button type="button" disabled={draft.exercises.length >= 30} onClick={() => update({ exercises: [...draft.exercises, { key: nextKey.current++, name: '', sets: '', reps: '' }] })} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm text-white hover:border-thrivv-gold-500/50 disabled:opacity-40">
          <Plus size={17} />{t("Add movement")}</button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-300">{t(error)}</p>}
      {saved && <p role="status" className="text-sm text-emerald-400">{t("Workout saved.")}</p>}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
        <p className="text-xs text-thrivv-text-muted">{t("Workout log only. Gym verification and reward points are separate.")}</p>
        <button type="submit" disabled={saving || saved} className="btn-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm disabled:opacity-60 sm:w-auto">
          {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
          {saving ? t("Saving...") : saved ? t("Saved") : t("Save workout")}
        </button>
      </div>
    </form>
  );
}
