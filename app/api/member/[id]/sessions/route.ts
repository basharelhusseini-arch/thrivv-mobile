import { NextRequest } from 'next/server';
import { legacyJson, legacyMemberAccess } from '@/lib/legacy-api-access';
import { store } from '@/lib/store';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const access = await legacyMemberAccess(params.id);
    if (!access.ok) return access.response;
    const memberId = access.user.id;
    const sessions = store.getMemberSessions(memberId);
    
    return legacyJson({
      memberId,
      completedSessions: sessions,
      source: 'legacy',
      verified: false,
    });
  } catch (error) {
    return legacyJson(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
