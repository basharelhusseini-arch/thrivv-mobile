import { getCurrentUser } from './auth';

export type ServerSessionIdentity =
  | { status: 'authenticated'; userId: string }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

/** Bind the document to its server request without serializing profile or token. */
export async function getServerSessionIdentity(): Promise<ServerSessionIdentity> {
  try {
    const user = await getCurrentUser();
    return user ? { status: 'authenticated', userId: user.id } : { status: 'unauthenticated' };
  } catch {
    // Public pages can still render; protected content requires an explicit retry.
    // Never turn an unavailable verification store into a signed-out identity.
    return { status: 'unavailable' };
  }
}
