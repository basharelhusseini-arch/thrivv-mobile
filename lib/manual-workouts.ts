import { getExerciseById } from '@/lib/exercises';

export const WORKOUT_LOG_LIMITS = {
  nameLength: 80,
  exerciseNameLength: 100,
  exerciseCount: 30,
  sets: 100,
  reps: 1000,
} as const;

export interface WorkoutSet { reps: number; weightKg: number | null }

export interface LoggedWorkoutExercise {
  setDetails?: WorkoutSet[];
  exerciseId?: string;
  name: string;
  sets: number;
  reps: number;
}

export interface ManualWorkoutInput {
  name: string;
  date: string;
  exercises: LoggedWorkoutExercise[];
}

export interface LoggedWorkout extends ManualWorkoutInput {
  id: string;
  memberId: string;
  status: 'completed';
  completedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseName(value: unknown, maxLength: number, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength
    || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`${label} must contain between 1 and ${maxLength} characters.`);
  }
  return value.trim();
}

export function isWorkoutLogDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value >= '1900-01-01' && value <= '2100-12-31'
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

function parseCount(value: unknown, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${label} must be a whole number between 1 and ${max}.`);
  }
  return value;
}

export function parseManualWorkoutInput(value: unknown): ManualWorkoutInput {
  if (!isRecord(value)) throw new Error('Invalid workout.');
  const name = parseName(value.name, WORKOUT_LOG_LIMITS.nameLength, 'Workout name');
  if (!isWorkoutLogDate(value.date)) throw new Error('Enter a valid workout date.');
  if (!Array.isArray(value.exercises) || value.exercises.length < 1
    || value.exercises.length > WORKOUT_LOG_LIMITS.exerciseCount) {
    throw new Error(`Add between 1 and ${WORKOUT_LOG_LIMITS.exerciseCount} exercises.`);
  }

  const exercises = value.exercises.map((entry: unknown): LoggedWorkoutExercise => {
    if (!isRecord(entry)) throw new Error('Invalid exercise.');
    const customName = parseName(entry.name, WORKOUT_LOG_LIMITS.exerciseNameLength, 'Movement name');
    const sets = parseCount(entry.sets, WORKOUT_LOG_LIMITS.sets, 'Sets');
    const reps = parseCount(entry.reps, WORKOUT_LOG_LIMITS.reps, 'Reps');
    let setDetails: WorkoutSet[] | undefined;
    if (entry.setDetails !== undefined) {
      if (!Array.isArray(entry.setDetails) || entry.setDetails.length !== sets) throw new Error('Add details for every set.');
      setDetails = entry.setDetails.map((set: unknown) => {
        if (!isRecord(set)) throw new Error('Invalid set.');
        const setReps = parseCount(set.reps, WORKOUT_LOG_LIMITS.reps, 'Set reps');
        const weightKg = set.weightKg;
        if (weightKg !== null && (typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1500)) throw new Error('Weight must be between 0 and 1500 kg, or left blank.');
        return { reps: setReps, weightKg: weightKg as number | null };
      });
    }
    const details = setDetails ? { setDetails } : {};
    if (entry.exerciseId !== undefined) {
      if (typeof entry.exerciseId !== 'string') throw new Error('Select a valid exercise.');
      const exercise = getExerciseById(entry.exerciseId);
      if (!exercise) throw new Error('Select a valid exercise or add it as a custom movement.');
      return { exerciseId: exercise.id, name: exercise.name, sets, reps, ...details };
    }
    return { name: customName, sets, reps, ...details };
  });

  // Reconstruct the payload so submitted ownership, reward and coaching fields are never persisted.
  return { name, date: value.date, exercises };
}

export interface LoggedWorkoutRow {
  id: string;
  member_id: string;
  name: string;
  date: string;
  exercises: LoggedWorkoutExercise[];
  completed_at: string;
}

export function loggedWorkoutView(row: LoggedWorkoutRow): LoggedWorkout {
  return {
    id: row.id,
    memberId: row.member_id,
    name: row.name,
    date: row.date,
    exercises: row.exercises.map(exercise => ({
      ...(exercise.exerciseId && { exerciseId: exercise.exerciseId }),
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      ...(exercise.setDetails && { setDetails: exercise.setDetails.map(set => ({ reps: set.reps, weightKg: set.weightKg })) }),
    })),
    status: 'completed',
    completedAt: row.completed_at,
  };
}

/** Old logs have unknown weights, never assume they used zero weight. */
export function workoutProgress(workouts: LoggedWorkout[]) {
  const movements = new Map<string, { name: string; latestKg: number; bestKg: number; date: string }>();
  for (const workout of [...workouts].sort((a,b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt))) {
    for (const exercise of workout.exercises) {
      const weights = exercise.setDetails?.flatMap(set => set.weightKg === null ? [] : [set.weightKg]) || [];
      if (!weights.length) continue;
      const key = exercise.name.trim().toLowerCase();
      const best = Math.max(...weights); const prior = movements.get(key);
      if (prior) prior.bestKg = Math.max(prior.bestKg, best);
      else movements.set(key, { name: exercise.name, latestKg: best, bestKg: best, date: workout.date });
    }
  }
  return [...movements.values()].sort((a,b) => a.name.localeCompare(b.name));
}
