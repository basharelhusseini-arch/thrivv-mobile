import { redirect } from 'next/navigation';
import { checkAdminAccess } from '@/lib/gym-auth';
import AdminGymsView from './_components/AdminGymsView';

export const dynamic = 'force-dynamic';

export default async function AdminGymsPage() {
  const access = await checkAdminAccess();
  if (!access.ok) {
    if (access.status === 401) redirect('/member/login');
    return (
      <div className="min-h-screen bg-thrivv-bg-darker flex items-center justify-center p-6">
        <div className="glass-card max-w-md p-10 text-center">
          <h1 className="text-2xl font-semibold text-thrivv-text-primary mb-2">
            Admin only
          </h1>
          <p className="text-sm text-thrivv-text-secondary">{access.reason}</p>
        </div>
      </div>
    );
  }
  return <AdminGymsView />;
}
