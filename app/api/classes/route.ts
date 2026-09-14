import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { legacyAdminAccess, legacyJson } from '@/lib/legacy-api-access';

export async function GET() {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const classes = store.getAllClasses();
    return legacyJson(classes);
  } catch (error) {
    return legacyJson({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const body = await request.json();
    const gymClass = store.addClass(body);
    return legacyJson(gymClass, { status: 201 });
  } catch (error) {
    return legacyJson({ error: 'Failed to create class' }, { status: 500 });
  }
}
