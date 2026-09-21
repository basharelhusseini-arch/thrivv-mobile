import { translator, type Locale } from '@/lib/i18n/core';
export type WorkoutVerification = {
  id: string; sport_name: string | null; start_at: string; end_at?: string; date: string;
  canScan: boolean; verified: boolean; scanUntil: string; status: string; workout_score?: number | null;
};
export type VerificationStatus = {
  whoopConnected?: boolean;
  mode?: 'manual' | 'whoop' | 'whoop_setup';
  gymId: string | null; date: string; timezone: string; verificationEnabled: boolean; rewardsEnabled: boolean;
  score: number | null; estimatedPoints: number | null; creditedPoints: number; rewardStatus: string;
  manual?: { eligible: boolean; enabled: boolean; checkedIn: boolean; verified: boolean; canScan: boolean; estimatedPoints: number };
  workouts: WorkoutVerification[];
};
export type MemberNextStep = { eyebrow: string; title: string; description: string; href: string; action: string; complete?: boolean };
/** The server decides eligibility. This helper only selects the next useful screen. */
export function memberNextStep(data: VerificationStatus, locale: Locale = 'en'): MemberNextStep {
  const t = translator(locale);
  if (!data.gymId) return { eyebrow: t("Start here"), title: t("Make it your gym."), description: t("Enter your gym’s joining code to connect your membership and see your community."), href: '/member/account/join-gym', action: t("Join your gym") };
  if (data.manual?.eligible) {
    if (data.manual.verified) return { eyebrow: t("Today · verified"), title: data.rewardStatus === 'credited' ? t('{0} points earned.', { 0: data.creditedPoints }) : t("Your workout is verified."), description: data.rewardStatus === 'credited' ? t("Your points are in your spendable balance. Today’s habits can add up to 10 points, within your 50-point daily limit.") : t("Your gym visit is recorded. Check Rewards for the latest credit status."), href: '/member/rewards', action: t("View rewards"), complete: true };
    if (!data.manual.enabled) return { eyebrow: t("Your training"), title: t("Keep your progress going."), description: t("Manual gym rewards are not available right now. Your workout plans and activity are still here."), href: '/member/workouts', action: t("View workouts") };
    if (!data.manual.checkedIn) return { eyebrow: t("Your next move"), title: t("Show up. Make it count."), description: t("Scan your gym’s rotating QR after training to earn 40 spendable points. Habits can add up to 10 more."), href: '/member/scan-workout', action: t("Scan gym QR") };
    if (data.manual.canScan) return { eyebrow: t("Workout saved"), title: t("One scan. 40 points."), description: t("Scan the workout QR at your gym to verify today’s session and credit your reward points."), href: '/member/scan-workout', action: t("Scan gym QR") };
    return { eyebrow: t("Workout saved"), title: t("Check your gym membership."), description: t("Your workout is saved, but gym verification is unavailable for your current membership."), href: '/member/account', action: t("View membership") };
  }
  if (data.workouts.some(w => w.canScan)) return { eyebrow: t("WHOOP workout synced"), title: t("Verify your gym visit."), description: t('Scan your gym’s rotating workout QR within two hours of finishing.') + (data.rewardsEnabled ? '' : t(' WHOOP reward conversion is not activated yet.')), href: '/member/scan-workout', action: t("Verify workout") };
  if (data.workouts.some(w => w.verified && w.date === data.date)) return { eyebrow: t("Today · verified"), title: t("Your workout is recorded."), description: t('Your WHOOP workout and gym visit are verified.') + (data.rewardsEnabled ? '' : t(' WHOOP reward conversion is not activated yet.')), href: '/member/health', action: t("View your progress"), complete: true };
  return { eyebrow: t("Your next move"), title: t("Bring your workout into view."), description: t("See your WHOOP performance and scan your gym’s QR to verify your workout, together in one place."), href: '/member/scan-workout', action: t("View performance & scan") };
}
