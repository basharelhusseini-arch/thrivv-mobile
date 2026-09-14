import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, revokeCurrentSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  try {
    await revokeCurrentSession(request.headers.get('cookie'));
    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
    clearSessionCookies(response, request.nextUrl.hostname);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to log out' },
      { status: 500 }
    );
  }
}
