import { supabase } from './supabase';
import { MemberResourceError } from './member-resource';
import type { Habit, HabitEntry, WorkoutProgress } from '@/types';

function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new Error('Member storage unavailable');
  return result.data;
}
function habit(row: any): Habit { return { ...row.fields, id: row.id, memberId: row.user_id, createdAt: row.created_at }; }
function entry(row: any): HabitEntry { return { ...row.fields, id: row.id, memberId: row.user_id, habitId: row.habit_id, date: row.date, completed: row.completed, completedAt: row.completed_at ?? undefined }; }

/** All reads and writes are scoped to a verified session, including after an ownership check. */
export const memberRecords = {
  async getMemberHabits(userId: string): Promise<Habit[]> {
    return (checked(await supabase.from('member_habits').select('*').eq('user_id', userId).order('created_at')) || []).map(habit);
  },
  async getHabit(id: string, userId: string): Promise<Habit | null> {
    const row = checked(await supabase.from('member_habits').select('*').eq('id', id).eq('user_id', userId).maybeSingle());
    return row ? habit(row) : null;
  },
  async addHabit(input: Omit<Habit, 'id' | 'createdAt'>): Promise<Habit> {
    const { memberId, ...fields } = input;
    return habit(checked(await supabase.from('member_habits').insert({ user_id: memberId, fields }).select().single()));
  },
  async updateHabit(id: string, fields: Partial<Habit>, userId: string): Promise<Habit> {
    // Merge in SQL while holding the row lock so concurrent edits cannot overwrite unrelated fields.
    const row = checked(await supabase.rpc('thrivv_update_habit', { p_user: userId, p_id: id, p_fields: fields }));
    if (!row) throw new MemberResourceError('Record not found.', 404);
    return habit(row);
  },
  async deleteHabit(id: string, userId: string): Promise<void> {
    checked(await supabase.from('member_habits').delete().eq('id', id).eq('user_id', userId));
  },
  async getMemberHabitEntries(userId: string): Promise<HabitEntry[]> {
    return (checked(await supabase.from('member_habit_entries').select('*').eq('user_id', userId).order('date')) || []).map(entry);
  },
  async getHabitEntries(id: string, userId: string): Promise<HabitEntry[]> {
    return (checked(await supabase.from('member_habit_entries').select('*').eq('habit_id', id).eq('user_id', userId).order('date')) || []).map(entry);
  },
  async addHabitEntry(input: Omit<HabitEntry, 'id' | 'completedAt'>): Promise<HabitEntry> {
    const { memberId, habitId, date, completed, ...fields } = input;
    return entry(checked(await supabase.from('member_habit_entries').upsert({ user_id: memberId, habit_id: habitId, date, completed, fields, completed_at: completed ? new Date().toISOString() : null }, { onConflict: 'habit_id,user_id,date' }).select().single()));
  },
  async updateHabitEntry(id: string, fields: { completed: boolean }, scope: { memberId: string; habitId: string }): Promise<HabitEntry> {
    const row = checked(await supabase.from('member_habit_entries').update({ completed: fields.completed, completed_at: fields.completed ? new Date().toISOString() : null }).eq('id', id).eq('user_id', scope.memberId).eq('habit_id', scope.habitId).select().maybeSingle());
    if (!row) throw new MemberResourceError('Record not found.', 404);
    return entry(row);
  },
  async getWorkoutProgress(id: string, userId: string): Promise<WorkoutProgress[]> {
    return (checked(await supabase.from('member_workout_progress').select('*').eq('workout_id', id).eq('user_id', userId).order('completed_at')) || []).map((row: any) => ({ ...row.fields, id: row.id, memberId: row.user_id, workoutId: row.workout_id, completedAt: row.completed_at }));
  },
  async addWorkoutProgress(input: Omit<WorkoutProgress, 'id' | 'completedAt'>): Promise<WorkoutProgress> {
    const { memberId, workoutId, ...fields } = input;
    const row = checked(await supabase.from('member_workout_progress').insert({ user_id: memberId, workout_id: workoutId, fields }).select().single());
    return { ...fields, id: row.id, memberId, workoutId, completedAt: row.completed_at };
  },
};
