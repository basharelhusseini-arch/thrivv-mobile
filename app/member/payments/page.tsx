'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, CreditCard } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useClientSession } from '@/lib/client-session';

interface Payment {
  id: string;
  memberId: string;
  membershipId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  createdAt: string;
}

export default function MemberPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const session = useClientSession();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (session.status === 'unauthenticated') router.replace('/member/login');
  }, [session.status, router]);

  useEffect(() => {
    setPayments([]);
    if (!session.user?.id) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const response = await fetch('/api/member/payments', { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error(data.error || 'Your payments could not be loaded.');
        setPayments(data);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Your payments could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [session.user?.id, retry]);

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-thrivv-neon-green" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-thrivv-gold-500" />;
      default:
        return <Clock className="w-4 h-4 text-thrivv-text-secondary" />;
    }
  };

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-thrivv-neon-green/10 text-thrivv-neon-green border border-thrivv-neon-green/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'pending':
        return 'bg-thrivv-gold-500/10 text-thrivv-gold-500 border border-thrivv-gold-500/20';
      default:
        return 'bg-thrivv-bg-card text-thrivv-text-secondary border border-thrivv-gold-500/10';
    }
  };

  if (session.status === 'error') {
    return <div role="alert" className="premium-card p-6 space-y-3"><p>We couldn&apos;t check your session.</p><button onClick={() => session.refresh()} className="btn-ghost px-4 py-2">Try again</button></div>;
  }
  if (session.status === 'unauthenticated') return null;
  if (loading || session.status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <CreditCard className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading payments
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Billing"
        title="Payment History"
        subtitle="Membership transactions and receipts."

      />

      <main>
        <div className="premium-card overflow-hidden">
          <div className="p-6">
            {error ? (
              <div role="alert" className="space-y-3 py-6 text-sm text-thrivv-text-secondary"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="btn-ghost px-4 py-2">Try again</button></div>
            ) : payments.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-14 h-14 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/20 mx-auto mb-4 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-thrivv-gold-500" />
                </div>
                <p className="text-thrivv-text-primary text-base font-medium mb-1">
                  No payments yet
                </p>
                <p className="text-thrivv-text-muted text-sm">
                  Your payment history will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.2em] text-thrivv-text-muted">
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Membership</th>
                      <th className="px-4 py-3 text-left font-medium">Amount</th>
                      <th className="px-4 py-3 text-left font-medium">Method</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, idx) => (
                      <tr
                        key={payment.id}
                        className={`hover:bg-thrivv-bg-card/40 transition-colors ${
                          idx > 0 ? 'border-t border-thrivv-gold-500/10' : ''
                        }`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-thrivv-text-primary">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-thrivv-text-primary">
                          {payment.membershipId || 'Membership'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-thrivv-gold-500 tabular-nums">
                          ${payment.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-thrivv-text-secondary">
                          {payment.paymentMethod}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(payment.status)}
                            <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md capitalize ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-thrivv-text-muted font-mono">
                          {payment.transactionId || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
