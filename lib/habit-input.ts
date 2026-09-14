import type { Habit } from '@/types';
import { MemberResourceError } from '@/lib/member-resource';

type HabitFields = Pick<Habit, 'name' | 'description' | 'category' | 'frequency' | 'targetCount' | 'color' | 'icon' | 'status'>;

/** Only editable display fields pass through; identities are always server-owned. */
export function habitFields(body: Record<string, unknown>, creating = false): Partial<HabitFields> {
  const result: Partial<HabitFields> = {};
  const bad = () => { throw new MemberResourceError('Check the habit details and try again.', 400); };
  if (creating || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120) bad();
    result.name = (body.name as string).trim();
  }
  if (creating || body.category !== undefined) {
    if (!['health', 'fitness', 'nutrition', 'recovery', 'sleep', 'productivity', 'other'].includes(body.category as string)) bad();
    result.category = body.category as Habit['category'];
  }
  if (creating || body.frequency !== undefined) {
    if (!['daily', 'weekly', 'custom'].includes(body.frequency as string)) bad();
    result.frequency = body.frequency as Habit['frequency'];
  }
  for (const key of ['description', 'icon'] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'string' || (body[key] as string).length > (key === 'description' ? 500 : 80)) bad();
      result[key] = body[key] as string;
    }
  }
  if (body.targetCount !== undefined) {
    if (typeof body.targetCount !== 'number' || !Number.isInteger(body.targetCount) || body.targetCount < 1 || body.targetCount > 100) bad();
    result.targetCount = body.targetCount as number;
  }
  if (body.color !== undefined) {
    if (typeof body.color !== 'string' || !/^#[\da-f]{6}$/i.test(body.color)) bad();
    result.color = body.color as string;
  }
  if (body.status !== undefined) {
    if (!['active', 'archived', 'paused'].includes(body.status as string)) bad();
    result.status = body.status as Habit['status'];
  }
  return result;
}
