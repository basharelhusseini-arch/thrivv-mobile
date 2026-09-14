import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession, writeSessionCookie } from '@/lib/auth';
import { gymReturnPath, portalWorkspaceUrl } from '@/lib/gym-routing';

export const dynamic = 'force-dynamic';
const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403, headers: privateHeaders });
  }
  let destination: unknown;
  try { destination = (await request.json()).destination; }
  catch { return NextResponse.json({ error: 'Choose a valid workspace' }, { status: 400, headers: privateHeaders }); }
  if (typeof destination !== 'string' || (destination !== '/member/dashboard' && gymReturnPath(destination) !== destination)) {
    return NextResponse.json({ error: 'Choose a valid workspace' }, { status: 400, headers: privateHeaders });
  }
  try {
    const authenticated = await getAuthenticatedSession();
    if (!authenticated) return NextResponse.json({ error: 'Please sign in again to switch workspaces' }, { status: 401, headers: privateHeaders });
    const response = NextResponse.json({ success: true, destination: portalWorkspaceUrl(request.nextUrl.hostname, destination) }, { headers: privateHeaders });
    // This explicit transition is the only legacy-cookie migration. Read-only
    // /me polling never writes a late token over a newer login in another tab.
    // Destination pages still enforce current gym membership/operator/admin role.
    writeSessionCookie(response, authenticated.token, request.nextUrl.hostname, authenticated.session.exp);
    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to switch workspaces. Please retry.' }, { status: 503, headers: privateHeaders });
  }
}
