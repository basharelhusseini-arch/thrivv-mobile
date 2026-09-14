import Link from 'next/link';
import type { ReactNode } from 'react';

export default function GymWorkspace({ gym, current, title, description, children }: {
  gym: { id: string; name: string }; current: string; title: string; description: string; children: ReactNode;
}) {
  return <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-6">
      <div className="min-w-0 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-thrivv-gold-500 break-words">{gym.name} / Gym workspace</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-thrivv-text-primary">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-thrivv-text-secondary">{description}</p>
      </div>
      {current !== 'qr' && <Link className="btn-primary inline-flex items-center gap-2 px-4 py-3 text-sm" href={`/gym/${gym.id}/qr`}>Display workout QR <span aria-hidden>↗</span></Link>}
    </header>
    {children}
  </main>;
}
