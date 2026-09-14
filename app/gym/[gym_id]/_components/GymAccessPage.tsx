import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { checkGymAccess, type GymRecord } from '@/lib/gym-auth';
import { gymLoginPath } from '@/lib/gym-routing';
import NotAuthorized from '../dashboard/_components/NotAuthorized';
import GymWorkspace from './GymWorkspace';

export default async function GymAccessPage({ gymId, section, title, description, children }: {
  gymId: string; section: string; title: string; description: string; children: ReactNode | ((gym: GymRecord) => ReactNode);
}) {
  const access = await checkGymAccess(gymId);
  if (!access.ok) {
    if (access.status === 401) redirect(gymLoginPath(`/gym/${gymId}/${section}`));
    return <NotAuthorized status={access.status} reason={access.reason} />;
  }
  return <GymWorkspace gym={access.gym} current={section} title={title} description={description}>
    {typeof children === 'function' ? children(access.gym) : children}
  </GymWorkspace>;
}
