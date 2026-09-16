import { NextRequest } from 'next/server';
import { recoveryBody, recoveryError, recoveryResponse, validateRecoveryToken } from '@/lib/password-recovery';

export async function POST(request: NextRequest) {
  try {
    const body = await recoveryBody(request);
    await validateRecoveryToken(body.accessToken);
    return recoveryResponse({ valid: true });
  } catch (error) {
    return recoveryError(error);
  }
}
