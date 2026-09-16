import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { legacyAdminAccess, legacyJson, legacyMemberAccess } from '@/lib/legacy-api-access';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const access = await legacyMemberAccess();
    if (!access.ok) return access.response;
    const exercise = store.getExercise(params.id);
    if (!exercise) {
      return legacyJson({ error: 'Exercise not found' }, { status: 404 });
    }
    return legacyJson(exercise);
  } catch (error) {
    return legacyJson({ error: 'Failed to fetch exercise' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const body = await request.json();
    const exercise = store.updateExercise(params.id, body);
    if (!exercise) {
      return legacyJson({ error: 'Exercise not found' }, { status: 404 });
    }
    return legacyJson(exercise);
  } catch (error) {
    return legacyJson({ error: 'Failed to update exercise' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const success = store.deleteExercise(params.id);
    if (!success) {
      return legacyJson({ error: 'Exercise not found' }, { status: 404 });
    }
    return legacyJson({ message: 'Exercise deleted successfully' });
  } catch (error) {
    return legacyJson({ error: 'Failed to delete exercise' }, { status: 500 });
  }
}
