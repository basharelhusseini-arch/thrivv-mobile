import Link from 'next/link';
import { Lock, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function NotAuthorized({
  status,
  reason,
}: {
  status: number;
  reason: string;
}) {
  const Icon =
    status === 403 ? ShieldAlert : status === 404 ? AlertTriangle : Lock;
  const title =
    status === 403
      ? 'You do not have access to this gym'
      : status === 404
      ? 'Gym not found'
      : 'Something went wrong';
  return (
    <div className="min-h-screen bg-thrivv-bg-darker flex items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-10 text-center animate-fade-in-up">
        <div className="icon-badge w-14 h-14 mx-auto flex items-center justify-center mb-6">
          <Icon className="w-7 h-7 text-thrivv-gold-500" />
        </div>
        <h1 className="text-2xl font-semibold text-thrivv-text-primary mb-2">
          {title}
        </h1>
        <p className="text-sm text-thrivv-text-secondary mb-6">{reason}</p>
        <Link href="/member/dashboard" className="btn-ghost px-5 py-2.5 inline-block">
          Back to your dashboard
        </Link>
      </div>
    </div>
  );
}
