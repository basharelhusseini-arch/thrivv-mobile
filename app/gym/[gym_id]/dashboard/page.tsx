import { gymLoginPath } from '@/lib/gym-routing';
import { redirect } from 'next/navigation';
import { gymDashboardData } from '@/lib/gym-dashboard-data';
import { checkGymAccess } from '@/lib/gym-auth';
import GymDashboardView from './_components/GymDashboardView';
import NotAuthorized from './_components/NotAuthorized';

export const dynamic = 'force-dynamic';

export default async function GymDashboardPage({
  params,
}: {
  params: { gym_id: string };
}) {
  const access = await checkGymAccess(params.gym_id);

  if (!access.ok) {
    if (access.status === 401) {
      redirect(gymLoginPath(`/gym/${params.gym_id}/dashboard`));
    }
    return <NotAuthorized status={access.status} reason={access.reason} />;
  }

  try {
    const data = await gymDashboardData(access.gym, access.isAdmin, access.isOwner);
    return <GymDashboardView data={data} />;
  } catch {
    return <main className="min-h-screen bg-thrivv-bg-darker flex items-center justify-center p-6"><section className="glass-card p-8 space-y-4"><h1 className="text-2xl font-semibold">Gym analytics unavailable</h1><p role="alert">We could not load your gym’s data.</p><a href={`/gym/${params.gym_id}/dashboard`} className="btn-primary inline-block px-5 py-3">Retry</a></section></main>;
  }
}
