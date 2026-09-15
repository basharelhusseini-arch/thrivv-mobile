export type VerificationMode = 'manual' | 'whoop' | 'whoop_setup';
/** Preference guides setup; server-derived eligibility always wins. */
export function verificationMode(manualEligible: boolean, profile: { has_wearable?: boolean; wearable_type?: string | null } | null | undefined): VerificationMode {
  if (!manualEligible) return 'whoop';
  return profile?.has_wearable && profile.wearable_type === 'whoop' ? 'whoop_setup' : 'manual';
}
