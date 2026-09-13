import { NextRequest, NextResponse } from 'next/server';
import { revokeCurrentSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  try {
    await revokeCurrentSession(request.headers.get('cookie'));
    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
    // Explicit headers preserve both same-name cookie deletions.
    const expired = `thrivv-session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
    response.headers.append('Set-Cookie', expired);
    if (process.env.COOKIE_DOMAIN) response.headers.append('Set-Cookie', `${expired}; Domain=${process.env.COOKIE_DOMAIN}`);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to log out' },
      { status: 500 }
    );
  }
}
