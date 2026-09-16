export type PasswordRecoveryLink = {
  accessToken: string | null;
  error: string | null;
};

export const INVALID_RECOVERY_LINK = 'This password reset link is invalid or has expired. Please request a new link.';

export function parsePasswordRecoveryLink(hash: string, search: string): PasswordRecoveryLink {
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const query = new URLSearchParams(search);

  if (
    fragment.has('error') || fragment.has('error_code') || fragment.has('error_description') ||
    query.has('error') || query.has('error_code') || query.has('error_description') ||
    fragment.getAll('type').length !== 1 || fragment.get('type') !== 'recovery' ||
    fragment.getAll('access_token').length !== 1
  ) {
    return { accessToken: null, error: INVALID_RECOVERY_LINK };
  }

  const accessToken = fragment.get('access_token');
  if (!accessToken || accessToken.length > 16384 || /\s/.test(accessToken)) {
    return { accessToken: null, error: INVALID_RECOVERY_LINK };
  }

  return { accessToken, error: null };
}
