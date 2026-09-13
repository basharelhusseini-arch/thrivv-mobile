import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import SupportInbox from '@/components/SupportInbox';
export const dynamic = 'force-dynamic';
export default async function GymSupportPage() {
  if (!await getCurrentUser()) redirect('/member/login?portal=gym&redirect=%2Fgym%2Fsupport');
  return <main className="max-w-6xl mx-auto p-4 sm:p-8"><SupportInbox /></main>;
}
