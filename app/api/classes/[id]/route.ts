import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { legacyAdminAccess, legacyJson } from '@/lib/legacy-api-access';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const gymClass = store.getClass(params.id);
    if (!gymClass) {
      return legacyJson({ error: 'Class not found' }, { status: 404 });
    }
    return legacyJson(gymClass);
  } catch (error) {
    return legacyJson({ error: 'Failed to fetch class' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const body = await request.json();
    const gymClass = store.updateClass(params.id, body);
    if (!gymClass) {
      return legacyJson({ error: 'Class not found' }, { status: 404 });
    }
    return legacyJson(gymClass);
  } catch (error) {
    return legacyJson({ error: 'Failed to update class' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const success = store.deleteClass(params.id);
    if (!success) {
      return legacyJson({ error: 'Class not found' }, { status: 404 });
    }
    return legacyJson({ message: 'Class deleted successfully' });
  } catch (error) {
    return legacyJson({ error: 'Failed to delete class' }, { status: 500 });
  }
}
