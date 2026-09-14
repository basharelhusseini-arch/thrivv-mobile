import { NextRequest, NextResponse } from 'next/server';
import { legacyMemberAccess, unavailableLegacyAction } from '@/lib/legacy-api-access';
import { supabase } from '@/lib/supabase';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

// Compatibility read for old clients. Identity comes from the server session;
// return real OAuth status, never tokens or a manually created connection.
export async function GET(request: NextRequest) {
  const access = await legacyMemberAccess(request.nextUrl.searchParams.get('memberId'));
  if (!access.ok) return access.response;
  const { data, error } = await supabase.from('whoop_connections')
    .select('whoop_connected_at, whoop_access_token').eq('id', access.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'WHOOP connection is temporarily unavailable.' }, { status: 503, headers });
  const connected = Boolean(data?.whoop_access_token && data?.whoop_connected_at);
  return NextResponse.json({
    memberId: access.user.id,
    connected,
    connectedAt: connected ? data?.whoop_connected_at : null,
  }, { headers });
}

export async function POST(request: NextRequest) {
  return unavailableLegacyAction(request, 'WHOOP_OAUTH_REQUIRED', 'Connect WHOOP from the Wearable page to securely authorize your account.');
}

export async function DELETE(request: NextRequest) {
  const access = await legacyMemberAccess(request.nextUrl.searchParams.get('memberId'));
  if (!access.ok) return access.response;
  return NextResponse.json({ error: 'Manage your WHOOP connection from the Wearable page.', code: 'WHOOP_OAUTH_REQUIRED' }, { status: 503, headers });
}
