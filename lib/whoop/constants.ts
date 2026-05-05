/**
 * Shared constants for the WHOOP integration. Lives outside
 * app/api so route handler files don't have to export non-route
 * symbols (which the Next.js App Router type-checks reject).
 */

export const WHOOP_STATE_COOKIE = 'thrivv-whoop-oauth-state';
