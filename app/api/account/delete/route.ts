import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { memberBody, MemberResourceError } from '@/lib/member-resource';
import { recoveryClient } from '@/lib/password-recovery';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
      throw new MemberResourceError('Invalid request origin.', 403);
    }
    const user = await getCurrentUser();
    if (!user) throw new MemberResourceError('Please sign in again.', 401);
    const body = await memberBody(request, user.id);
    if (body.memberId !== user.id) throw new MemberResourceError('Your account changed. Refresh and try again.', 403);
    if (body.confirmation !== 'DELETE' || typeof body.password !== 'string' || !body.password || body.password.length > 4096) {
      throw new MemberResourceError('Enter your current password and type DELETE to confirm.', 400);
    }
    // No destructive action unless the atomic database cleanup is installed.
    const ready = await supabase.rpc('thrivv_account_deletion_ready');
    if (ready.error || ready.data !== true) throw new Error('Deletion unavailable');
    // Use Auth's current email, never an email or target ID supplied by the browser.
    const identity = await supabase.auth.admin.getUserById(user.id);
    if (identity.error || !identity.data.user?.email) throw new Error('Identity unavailable');
    const client = recoveryClient();
    const verified = await client.auth.signInWithPassword({ email: identity.data.user.email, password: body.password });
    try {
      if (verified.error) {
        const status = verified.error.status;
        if (status === 429) throw new MemberResourceError('Too many attempts. Wait a few minutes and try again.', 429);
        if (!status || status >= 500) throw new Error('Identity verification unavailable');
        throw new MemberResourceError('Incorrect password. Please try again.', 400);
      }
      if (verified.data.user?.id !== user.id || !verified.data.session) throw new Error('Identity mismatch');
      // Hard deletion invokes the cleanup trigger in the same database transaction.
      // Auth sessions cascade; thrivv_session_valid rejects old app cookies immediately.
      const deleted = await supabase.auth.admin.deleteUser(user.id, false);
      if (deleted.error) throw new Error('Deletion failed');
      const response = NextResponse.json({ success: true }, { headers });
      clearSessionCookies(response, request.nextUrl.hostname);
      return response;
    } finally {
      // Do not leave an extra password-verification session alive on a failed request.
      if (verified.data.session) await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof MemberResourceError ? error.message : 'Unable to confirm deletion. Try signing in again to check your account, then retry if it still exists.' }, {
      status: error instanceof MemberResourceError ? error.status : 503, headers,
    });
  }
}
