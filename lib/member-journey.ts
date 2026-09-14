export type WorkoutVerification = {
  id: string; sport_name: string | null; start_at: string; end_at?: string; date: string;
  canScan: boolean; verified: boolean; scanUntil: string; status: string; workout_score?: number | null;
};
export type VerificationStatus = {
  gymId: string | null; date: string; timezone: string; verificationEnabled: boolean; rewardsEnabled: boolean;
  score: number | null; estimatedPoints: number | null; creditedPoints: number; rewardStatus: string;
  manual?: { eligible: boolean; enabled: boolean; checkedIn: boolean; verified: boolean; canScan: boolean; estimatedPoints: number };
  workouts: WorkoutVerification[];
};
export type MemberNextStep = { eyebrow: string; title: string; description: string; href: string; action: string; complete?: boolean };
/** The server decides eligibility. This helper only selects the next useful screen. */
export function memberNextStep(data: VerificationStatus): MemberNextStep {
  if (!data.gymId) return { eyebrow: 'Start here', title: 'Make it your gym.', description: 'Enter your gym’s joining code to connect your membership and see your community.', href: '/member/account/join-gym', action: 'Join your gym' };
  if (data.manual?.eligible) {
    if (data.manual.verified) return { eyebrow: 'Today · verified', title: data.rewardStatus === 'credited' ? `${data.creditedPoints} points earned.` : 'Your workout is verified.', description: data.rewardStatus === 'credited' ? 'Your points are in your spendable balance. Today’s habits can add up to 10 points, within your 50-point daily limit.' : 'Your gym visit is recorded. Check Rewards for the latest credit status.', href: '/member/rewards', action: 'View rewards', complete: true };
    if (!data.manual.enabled) return { eyebrow: 'Your training', title: 'Keep your progress going.', description: 'Manual gym rewards are not available right now. Your workout plans and activity are still here.', href: '/member/workouts', action: 'View workouts' };
    if (!data.manual.checkedIn) return { eyebrow: 'Your next move', title: 'Show up. Make it count.', description: 'Log your completed workout, then scan your gym’s rotating QR to earn 40 spendable points. Habits can add up to 10 more.', href: '/member/checkin', action: 'Log today’s workout' };
    if (data.manual.canScan) return { eyebrow: 'Workout saved', title: 'One scan. 40 points.', description: 'Scan the workout QR at your gym to verify today’s session and credit your reward points.', href: '/member/scan-workout', action: 'Scan gym QR' };
    return { eyebrow: 'Workout saved', title: 'Check your gym membership.', description: 'Your workout is saved, but gym verification is unavailable for your current membership.', href: '/member/account', action: 'View membership' };
  }
  if (data.workouts.some(w => w.canScan)) return { eyebrow: 'WHOOP workout synced', title: 'Verify your gym visit.', description: 'Scan your gym’s rotating workout QR within two hours of finishing. WHOOP reward conversion is not activated yet.', href: '/member/scan-workout', action: 'Verify workout' };
  if (data.workouts.some(w => w.verified && w.date === data.date)) return { eyebrow: 'Today · verified', title: 'Your workout is recorded.', description: 'Your WHOOP workout and gym visit are verified. WHOOP reward conversion is not activated yet.', href: '/member/health', action: 'View your progress', complete: true };
  return { eyebrow: 'Your next move', title: 'Bring your workout into view.', description: 'Sync your WHOOP workout after training, then verify your gym visit. Connected accounts use WHOOP workouts only.', href: '/member/whoop', action: 'Open WHOOP' };
}
