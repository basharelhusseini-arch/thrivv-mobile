'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/MemberPageHeader';
import { useClientSession } from '@/lib/client-session';
import { readLocalBookingRecords, type LocalBookingRecord } from '@/lib/local-booking-records';

export default function MemberBookingsPage() {
  const router = useRouter();
  const session = useClientSession();
  const [records, setRecords] = useState<LocalBookingRecord[]>([]);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    if (session.status === 'unauthenticated') router.replace('/member/login');
  }, [session.status, router]);

  useEffect(() => {
    setRecords([]);
    setStorageError('');
    if (!session.user?.id) return;
    try {
      const result = readLocalBookingRecords(localStorage.getItem(`bookings_${session.user.id}`), session.user.id);
      setRecords(result.records);
      if (result.unreadable) setStorageError('Some older saved records could not be displayed. They are still stored on this device.');
    } catch {
      setStorageError('Saved records on this device could not be opened. You can still arrange a session with your gym.');
    }
  }, [session.user?.id]);

  if (session.status === 'loading') {
    return <div role="status" className="premium-card p-8 text-thrivv-text-secondary">Loading your schedule…</div>;
  }
  if (session.status === 'error') {
    return <div role="alert" className="premium-card p-6 space-y-3"><p>We couldn&apos;t check your session.</p><button onClick={() => session.refresh()} className="btn-ghost px-4 py-2">Try again</button></div>;
  }
  if (session.status !== 'authenticated') return null;

  return (
    <div className="member-future space-y-6" data-section="bookings">
      <PageHeader section="bookings" eyebrow="Schedule" title="Make time for progress." subtitle="Arrange classes and coaching with your gym." />

      <section className="premium-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-thrivv-gold-500/5 blur-3xl" />
        <div className="relative max-w-xl">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-thrivv-gold-500/20 bg-thrivv-gold-500/10"><CalendarDays className="h-6 w-6 text-thrivv-gold-500" /></div>
          <h2 className="text-xl font-semibold text-thrivv-text-primary">Book directly with your gym</h2>
          <p className="mt-3 text-sm leading-relaxed text-thrivv-text-secondary">Online class and trainer booking is not available yet. Ask your gym&apos;s reception for the current timetable, available coaches and booking confirmation.</p>
          <div className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-thrivv-text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-thrivv-gold-500" /><p>Workouts and reward verification are available separately in Workouts.</p></div>
          <Link href="/member/workouts" className="btn-ghost mt-6 inline-flex items-center gap-2 px-4 py-2.5 text-sm">Go to workouts <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </section>

      {storageError && <p role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">{storageError}</p>}

      {records.length > 0 && (
        <section className="premium-card p-6">
          <h2 className="text-lg font-semibold text-thrivv-text-primary">Saved on this device</h2>
          <p className="mt-2 text-sm leading-relaxed text-thrivv-text-secondary">These older records were saved only in this browser. They were not sent to a trainer or confirmed by your gym. Please contact your gym before attending.</p>
          <div className="mt-5 divide-y divide-thrivv-gold-500/10">
            {records.map((record, index) => (
              <div key={`${record.id}-${index}`} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-medium text-thrivv-text-primary">{record.title}</p><p className="mt-1 text-sm text-thrivv-text-muted">{new Date(record.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
                <span className="w-fit rounded-full border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 px-3 py-1 text-xs text-thrivv-text-secondary">{record.status === 'cancelled' ? 'Cancelled local record' : 'Unconfirmed local record'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
