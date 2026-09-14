import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import type { Member } from '@/types';
import { legacyAdminAccess, legacyJson } from '@/lib/legacy-api-access';

export async function GET() {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const members = store.getAllMembers();
    return legacyJson(members.map(safeMember));
  } catch (error) {
    return legacyJson({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const body = await request.json();
    const member = store.addMember(body);
    return legacyJson(safeMember(member), { status: 201 });
  } catch (error) {
    return legacyJson({ error: 'Failed to create member' }, { status: 500 });
  }
}

// Password material is never part of an API response, including admin views.
function safeMember(member: Member) {
  const { password: _password, ...profile } = member;
  return profile;
}
