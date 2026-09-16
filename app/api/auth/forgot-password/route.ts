import { NextRequest } from 'next/server';
import {
  PASSWORD_RESET_REDIRECT, PASSWORD_RESET_SENT_MESSAGE, PasswordRecoveryError,
  recoveryBody, recoveryClient, recoveryError, recoveryResponse,
} from '@/lib/password-recovery';

export async function POST(request: NextRequest) {
  try {
    const body = await recoveryBody(request);
    if (typeof body.email !== 'string' || body.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      throw new PasswordRecoveryError('Enter a valid email address.', 400);
    }
    const { error } = await recoveryClient().auth.resetPasswordForEmail(body.email.trim(), { redirectTo: PASSWORD_RESET_REDIRECT });
    // Match Auth's non-enumerating response for account-specific failures and cooldowns.
    const hiddenErrors = ['user_not_found', 'email_not_confirmed', 'over_email_send_rate_limit', 'email_address_not_authorized'];
    if (error && error.status !== 429 && !hiddenErrors.includes(error.code || '')) {
      throw new PasswordRecoveryError('Unable to request a reset email right now. Please try again shortly.', 503);
    }
    return recoveryResponse({ success: true, message: PASSWORD_RESET_SENT_MESSAGE });
  } catch (error) {
    return recoveryError(error);
  }
}
