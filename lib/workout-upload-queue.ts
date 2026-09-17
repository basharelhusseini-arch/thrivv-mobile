import { parseManualWorkoutInput, type ManualWorkoutInput } from '@/lib/manual-workouts';
export type WorkoutUpload = { requestId: string; expectedUserId: string } & ManualWorkoutInput;
export type QueuedWorkout = { payload: WorkoutUpload; createdAt: number; error?: string };
const prefix = (userId: string) => `thrivv:workout-upload:${userId}:`;
export function queuedWorkouts(userId: string): QueuedWorkout[] {
  const items: QueuedWorkout[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix(userId))) continue;
    const row = JSON.parse(localStorage.getItem(key)!);
    if (row.payload?.expectedUserId !== userId) continue;
    parseManualWorkoutInput(row.payload);
    items.push(row);
  }
  return items.sort((a,b) => a.createdAt-b.createdAt);
}
export function enqueueWorkout(payload: WorkoutUpload) {
  parseManualWorkoutInput(payload);
  const key = prefix(payload.expectedUserId) + payload.requestId;
  const existing = localStorage.getItem(key);
  if (existing) {
    if (JSON.stringify(JSON.parse(existing).payload) !== JSON.stringify(payload)) throw new Error('This save is already queued. Review it before changing the workout.');
    return;
  }
  localStorage.setItem(key, JSON.stringify({payload, createdAt:Date.now()}));
  window.dispatchEvent(new Event('thrivv:upload-queue'));
}
const active = new Set<string>();
const offline = () => navigator.onLine === false;
export async function flushWorkoutQueue(userId: string, signal: AbortSignal): Promise<number> {
  if (active.has(userId) || signal.aborted || offline()) return 0;
  active.add(userId);
  let synced = 0;
  try {
    for (const row of queuedWorkouts(userId)) {
      if (signal.aborted || offline()) break;
      if (row.error) continue;
      const key = prefix(userId) + row.payload.requestId;
      try {
        const response = await fetch('/api/workouts/log', {method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify(row.payload), signal:AbortSignal.any([signal, AbortSignal.timeout(20000)])});
        if (signal.aborted) break;
        // Never retry another account's queue under its session or discard an uncertain save.
        if (response.status === 401 || response.status === 403 || response.status >= 500 || response.status === 429) break;
        const data = await response.json();
        if (!response.ok) {
          localStorage.setItem(key, JSON.stringify({...row,error:data.error || 'This workout needs review.'}));
          continue;
        }
        if (!data.workout?.id) break;
        localStorage.removeItem(key);
        synced++;
      } catch { break; }
    }
  } finally { active.delete(userId); }
  if (synced) window.dispatchEvent(new Event('thrivv:workouts-synced'));
  return synced;
}
export function discardQueuedWorkout(userId: string, requestId: string) {
  localStorage.removeItem(prefix(userId)+requestId);
  window.dispatchEvent(new Event('thrivv:upload-queue'));
}
