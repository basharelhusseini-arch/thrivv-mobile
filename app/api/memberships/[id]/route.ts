import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { legacyAdminAccess, legacyJson } from '@/lib/legacy-api-access';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const membership = store.getMembership(params.id);
    if (!membership) {
      return legacyJson({ error: 'Membership not found' }, { status: 404 });
    }
    return legacyJson(membership);
  } catch (error) {
    return legacyJson({ error: 'Failed to fetch membership' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const body = await request.json();
    const membership = store.updateMembership(params.id, body);
    if (!membership) {
      return legacyJson({ error: 'Membership not found' }, { status: 404 });
    }
    return legacyJson(membership);
  } catch (error) {
    return legacyJson({ error: 'Failed to update membership' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const success = store.deleteMembership(params.id);
    if (!success) {
      return legacyJson({ error: 'Membership not found' }, { status: 404 });
    }
    return legacyJson({ message: 'Membership deleted successfully' });
  } catch (error) {
    return legacyJson({ error: 'Failed to delete membership' }, { status: 500 });
  }
}
