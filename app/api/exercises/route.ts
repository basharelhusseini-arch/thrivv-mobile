import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { legacyAdminAccess, legacyJson, legacyMemberAccess } from '@/lib/legacy-api-access';

export async function GET() {
  try {
    const access = await legacyMemberAccess();
    if (!access.ok) return access.response;
    const exercises = store.getAllExercises();
    return legacyJson(exercises);
  } catch (error) {
    return legacyJson({ error: 'Failed to fetch exercises' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const body = await request.json();
    const exercise = store.addExercise(body);
    return legacyJson(exercise, { status: 201 });
  } catch (error) {
    return legacyJson({ error: 'Failed to create exercise' }, { status: 500 });
  }
}
