import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import type { Member } from '@/types';
import { legacyAdminAccess, legacyJson } from '@/lib/legacy-api-access';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const member = store.getMember(params.id);
    if (!member) {
      return legacyJson({ error: 'Member not found' }, { status: 404 });
    }
    return legacyJson(safeMember(member));
  } catch (error) {
    return legacyJson({ error: 'Failed to fetch member' }, { status: 500 });
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
    const member = store.updateMember(params.id, body);
    if (!member) {
      return legacyJson({ error: 'Member not found' }, { status: 404 });
    }
    return legacyJson(safeMember(member));
  } catch (error) {
    return legacyJson({ error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const success = store.deleteMember(params.id);
    if (!success) {
      return legacyJson({ error: 'Member not found' }, { status: 404 });
    }
    return legacyJson({ message: 'Member deleted successfully' });
  } catch (error) {
    return legacyJson({ error: 'Failed to delete member' }, { status: 500 });
  }
}

// Password material is never part of an API response, including admin views.
function safeMember(member: Member) {
  const { password: _password, ...profile } = member;
  return profile;
}
