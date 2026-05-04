import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { checkGymAccess } from '@/lib/gym-auth';
import GymDashboardView, { type GymAnalytics } from './_components/GymDashboardView';
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
      redirect('/member/login');
    }
    return <NotAuthorized status={access.status} reason={access.reason} />;
  }

  // Server-side fetch through our own analytics route so logic stays
  // in one place. Forward the session cookie so checkGymAccess passes
  // again inside the route handler.
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host');
  const cookie = h.get('cookie') ?? '';
  const baseUrl = `${proto}://${host}`;

  const res = await fetch(`${baseUrl}/api/gym/${params.gym_id}/analytics`, {
    cache: 'no-store',
    headers: { cookie },
  });

  if (!res.ok) {
    return <NotAuthorized status={500} reason="Failed to load analytics" />;
  }

  const data = (await res.json()) as GymAnalytics;
  return <GymDashboardView data={data} />;
}
