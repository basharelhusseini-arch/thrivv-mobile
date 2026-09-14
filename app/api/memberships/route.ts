import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { legacyAdminAccess, legacyJson } from '@/lib/legacy-api-access';

export async function GET() {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const memberships = store.getAllMemberships();
    return legacyJson(memberships);
  } catch (error) {
    return legacyJson({ error: 'Failed to fetch memberships' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const body = await request.json();
    const membership = store.addMembership(body);
    return legacyJson(membership, { status: 201 });
  } catch (error) {
    return legacyJson({ error: 'Failed to create membership' }, { status: 500 });
  }
}
