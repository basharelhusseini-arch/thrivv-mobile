'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useClientSession } from '@/lib/client-session';
import PageHeader from '@/components/MemberPageHeader';
import WorkoutLogForm from '@/components/WorkoutLogForm';

export default function LogWorkoutPage() {
  const { user } = useClientSession();
  const router = useRouter();
  if (!user) return <p role="status" className="text-thrivv-text-secondary">Loading workout...</p>;
  return (
    <div className="member-future space-y-6" data-section="workouts">
      <Link href="/member/workouts" className="inline-flex items-center gap-2 text-sm text-thrivv-text-secondary hover:text-white"><ArrowLeft size={16} />Back to workouts</Link>
      <PageHeader section="workouts" title="Log your workout." subtitle="Your movements, sets, reps and weights." />
      <div className="mx-auto max-w-3xl">
        <WorkoutLogForm key={user.id} memberId={user.id} onSaved={() => router.push('/member/workouts#workout-log')} />
      </div>
    </div>
  );
}
