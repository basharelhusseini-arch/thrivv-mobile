'use client';

import GymJoinCode from '@/components/GymJoinCode';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, Plus, ExternalLink, UserPlus, Calendar, Mail } from 'lucide-react';

type GymRow = {
  id: string;
  name: string;
  owner_email: string;
  pilot_start_date: string | null;
  pilot_member_count: number;
  created_at: string;
  member_count: number;
};

export default function AdminGymsView() {
  const [gyms, setGyms] = useState<GymRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    const res = await fetch('/api/admin/gyms', { cache: 'no-store' });
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error || 'Failed to load gyms');
      setLoading(false);
      return;
    }
    const json = await res.json();
    setGyms(json.gyms || []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="min-h-screen bg-thrivv-bg-darker relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute -top-1/3 -right-1/3 w-[60vw] h-[60vw] bg-thrivv-gold-500/5 rounded-full blur-3xl" />
      </div>

      <main className="relative max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-14 space-y-10">
        <header className="flex items-end justify-between gap-4 animate-fade-in-up">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.28em] mb-5">
              <Building2 className="w-3 h-3" />
              Admin · Gyms
            </span>
            <h1 className="text-balance text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold text-thrivv-text-primary tracking-tighter leading-[1.02]">
              Manage Gym Pilots
            </h1>
          </div>
        </header>

        {error && (
          <div className="error-badge p-4 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up delay-100">
          <div className="lg:col-span-2 premium-card">
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="text-lg font-semibold text-thrivv-text-primary">
                All gyms
              </h2>
              <span className="text-xs text-thrivv-text-muted uppercase tracking-widest">
                {gyms.length}
              </span>
            </div>
            <div className="divider" />
            {loading ? (
              <div className="p-10 text-center text-thrivv-text-secondary text-sm">
                Loading…
              </div>
            ) : gyms.length === 0 ? (
              <div className="p-10 text-center">
                <Building2 className="w-8 h-8 text-thrivv-text-muted mx-auto mb-3" />
                <p className="text-sm text-thrivv-text-secondary">
                  No gyms yet. Add your first one on the right.
                </p>
              </div>
            ) : (
              <ul className="p-4 space-y-2">
                {gyms.map((g) => (
                  <li
                    key={g.id}
                    className="bg-thrivv-bg-card/40 hover:bg-thrivv-bg-card/70 border border-transparent hover:border-thrivv-gold-500/20 rounded-xl p-4 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-thrivv-text-primary truncate">
                          {g.name}
                        </div>
                        <div className="text-xs text-thrivv-text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {g.owner_email}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {g.pilot_start_date ?? 'no pilot date'}
                          </span>
                          <span>· {g.member_count} members</span>
                          <span>· pilot cohort {g.pilot_member_count}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/gym/${g.id}/dashboard`}
                          className="btn-ghost px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                        >
                          Open <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                    <AssignUser gymId={g.id} onAssigned={reload} />
                    <GymJoinCode gymId={g.id} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <CreateGymForm onCreated={reload} />
          </div>
        </div>
      </main>
    </div>
  );
}

function CreateGymForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    owner_email: '',
    pilot_start_date: '',
    pilot_member_count: 0,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/admin/gyms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        owner_email: form.owner_email,
        pilot_start_date: form.pilot_start_date || null,
        pilot_member_count: Number(form.pilot_member_count) || 0,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg({ kind: 'err', text: j.error || 'Failed to create gym' });
      return;
    }
    setMsg({ kind: 'ok', text: 'Gym created' });
    setForm({ name: '', owner_email: '', pilot_start_date: '', pilot_member_count: 0 });
    onCreated();
  };

  return (
    <div className="premium-card p-6">
      <h2 className="flex items-center text-lg font-semibold text-thrivv-text-primary mb-4">
        <Plus className="w-5 h-5 mr-2 text-thrivv-gold-500" /> Add a gym
      </h2>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Gym name">
          <input
            required
            className="input-premium w-full px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Iron Works HQ"
          />
        </Field>
        <Field label="Owner email">
          <input
            required
            type="email"
            className="input-premium w-full px-3 py-2 text-sm"
            value={form.owner_email}
            onChange={(e) =>
              setForm({ ...form, owner_email: e.target.value })
            }
            placeholder="owner@gym.com"
          />
        </Field>
        <Field label="Pilot start date">
          <input
            type="date"
            className="input-premium w-full px-3 py-2 text-sm"
            value={form.pilot_start_date}
            onChange={(e) =>
              setForm({ ...form, pilot_start_date: e.target.value })
            }
          />
        </Field>
        <Field label="Pilot member count">
          <input
            type="number"
            min={0}
            className="input-premium w-full px-3 py-2 text-sm"
            value={form.pilot_member_count}
            onChange={(e) =>
              setForm({
                ...form,
                pilot_member_count: parseInt(e.target.value || '0', 10),
              })
            }
          />
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full py-2.5 text-sm disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create gym'}
        </button>
        {msg && (
          <div
            className={`text-xs px-3 py-2 rounded-lg ${
              msg.kind === 'ok' ? 'success-badge' : 'error-badge'
            }`}
          >
            {msg.text}
          </div>
        )}
      </form>
    </div>
  );
}

function AssignUser({
  gymId,
  onAssigned,
}: {
  gymId: string;
  onAssigned: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [start, setStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/gyms/${gymId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        membership_start_date: start || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg({ kind: 'err', text: j.error || 'Failed to assign' });
      return;
    }
    setMsg({ kind: 'ok', text: `Assigned ${email}` });
    setEmail('');
    setStart('');
    onAssigned();
  };

  return (
    <div className="mt-3 pt-3 border-t border-thrivv-gold-500/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-thrivv-gold-500 hover:text-thrivv-gold-400 inline-flex items-center gap-1.5"
      >
        <UserPlus className="w-3.5 h-3.5" />
        {open ? 'Close' : 'Assign a user by email'}
      </button>
      {open && (
        <form
          onSubmit={submit}
          className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 animate-fade-in"
        >
          <input
            required
            type="email"
            className="input-premium px-3 py-2 text-xs sm:col-span-2"
            placeholder="member@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="date"
            className="input-premium px-3 py-2 text-xs"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            title="Optional membership start date"
          />
          <button
            type="submit"
            disabled={busy}
            className="btn-primary px-3 py-2 text-xs sm:col-span-3 disabled:opacity-60"
          >
            {busy ? 'Assigning…' : 'Assign to gym'}
          </button>
          {msg && (
            <div
              className={`sm:col-span-3 text-[11px] px-3 py-2 rounded-lg ${
                msg.kind === 'ok' ? 'success-badge' : 'error-badge'
              }`}
            >
              {msg.text}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-thrivv-text-muted mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}
