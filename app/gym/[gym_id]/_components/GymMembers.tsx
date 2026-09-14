'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import useGymData from './useGymData';

type MembersResult = { members: { id: string; name: string; joined_at: string | null; last_verified_at: string | null }[]; total: number; offset: number; page_size: number };

export default function GymMembers({ gymId }: { gymId: string }) {
  const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [offset, setOffset] = useState(0);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setOffset(0); }, 250); return () => clearTimeout(timer); }, [search]);
  const { data, error, retry } = useGymData<MembersResult>(`/api/gym/${gymId}/members?q=${encodeURIComponent(query)}&offset=${offset}`);
  return <section className="dark-card overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5">
      <label className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 sm:max-w-sm"><Search aria-hidden className="h-4 w-4 text-thrivv-text-muted" /><span className="sr-only">Search members by name</span><input className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-thrivv-text-muted" placeholder="Search members by name" value={search} onChange={event => setSearch(event.target.value)} maxLength={80} /></label>
      <p className="text-sm text-thrivv-text-secondary" aria-live="polite">{data ? `${data.total} ${query ? 'matching members' : 'members on Thrivv'}` : 'Loading members…'}</p>
    </div>
    {error ? <div className="p-6 space-y-3"><p role="alert">{error}</p><button className="text-thrivv-gold-500 underline" onClick={retry}>Retry</button></div> : !data ? <p role="status" className="p-8 text-sm text-thrivv-text-secondary">Loading your members…</p> : !data.members.length ? <div className="px-6 py-14 text-center"><Users aria-hidden className="mx-auto mb-4 h-8 w-8 text-thrivv-gold-500" /><h2 className="text-lg font-semibold">{query ? 'No members match this search' : 'Your community starts here'}</h2><p className="mt-2 text-sm text-thrivv-text-secondary">{query ? 'Try a first or last name.' : 'Share your gym joining code to welcome your first member.'}</p>{!query && <Link className="btn-primary mt-5 inline-block px-5 py-3 text-sm" href={`/gym/${gymId}/invite`}>Invite members</Link>}</div> : <>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Current Thrivv members at your gym</caption><thead className="bg-white/[0.02] text-xs text-thrivv-text-muted"><tr><th className="px-5 py-4 font-medium">Member</th><th className="px-5 py-4 font-medium whitespace-nowrap">Joined your gym</th><th className="px-5 py-4 font-medium whitespace-nowrap">Last verified workout</th></tr></thead><tbody className="divide-y divide-white/5">{data.members.map(member => <tr key={member.id} className="hover:bg-white/[0.02]"><td className="px-5 py-5 font-medium text-thrivv-text-primary">{member.name}</td><td className="px-5 py-5 whitespace-nowrap text-thrivv-text-secondary">{member.joined_at ? new Date(`${member.joined_at}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not recorded'}</td><td className="px-5 py-5 text-thrivv-text-secondary whitespace-nowrap">{member.last_verified_at ? new Date(member.last_verified_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No verified workouts yet'}</td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 p-5 text-sm"><button className="btn-ghost px-3 py-2 disabled:opacity-40" disabled={offset === 0} onClick={() => setOffset(n => Math.max(0, n - data.page_size))}>Previous</button><span className="text-thrivv-text-secondary">{offset + 1}–{Math.min(offset + data.page_size, data.total)} of {data.total}</span><button className="btn-ghost px-3 py-2 disabled:opacity-40" disabled={offset + data.page_size >= data.total} onClick={() => setOffset(n => n + data.page_size)}>Next</button></div>
    </>}
  </section>;
}
