'use client';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, ScanLine } from 'lucide-react';
import { memberNextStep, type VerificationStatus } from '@/lib/member-journey';
export default function MemberNextAction({ data }: { data: VerificationStatus }) {
  const step = memberNextStep(data);
  const Icon = step.complete ? CheckCircle2 : ScanLine;
  return <section className="relative overflow-hidden rounded-3xl border border-thrivv-gold-500/30 bg-gradient-to-br from-thrivv-gold-500/[0.10] via-[#151511] to-[#0c0e0d] p-6 sm:p-8" aria-label="Your next step">
    <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-thrivv-gold-500/10" aria-hidden="true" />
    <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-xl"><p className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-thrivv-gold-400"><Icon size={16} />{step.eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{step.title}</h2><p className="mt-3 text-sm leading-relaxed text-thrivv-text-secondary">{step.description}</p></div>
      <Link href={step.href} className="btn-primary inline-flex shrink-0 items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-sm">{step.action}<ArrowUpRight size={18} /></Link>
    </div>
  </section>;
}
