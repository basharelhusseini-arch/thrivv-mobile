import { NextRequest } from 'next/server';
import { clearSessionCookies } from '@/lib/auth';
import {
  PasswordRecoveryError, changeRecoveryPassword, recoveryBody, recoveryError,
  recoveryResponse, revokeRecoverySessions, validateRecoveryToken,
} from '@/lib/password-recovery';

export async function POST(request: NextRequest) {
  try {
    const body = await recoveryBody(request);
    if (typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 128) {
      throw new PasswordRecoveryError('Use a password between 6 and 128 characters.', 400);
    }
    if (body.confirmPassword !== body.password) throw new PasswordRecoveryError('Passwords do not match.', 400);
    const { client, accessToken } = await validateRecoveryToken(body.accessToken);
    await changeRecoveryPassword(accessToken, body.password);
    const revoked = await revokeRecoverySessions(client, accessToken);
    const response = recoveryResponse({
      success: true,
      ...(!revoked && { warning: 'Your password was changed, but we could not confirm sign-out on every device. Please contact support if you suspect someone else has account access.' }),
    });
    clearSessionCookies(response, request.nextUrl.hostname);
    return response;
  } catch (error) {
    return recoveryError(error);
  }
}
