export default function GymLoading() {
  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8 space-y-6" aria-busy="true" aria-label="Loading gym workspace">
    <p role="status" className="sr-only">Loading your gym workspace…</p>
    <div className="space-y-4 border-b border-white/10 pb-6"><div className="h-3 w-40 rounded bg-white/5 motion-safe:animate-pulse" /><div className="h-9 w-64 max-w-full rounded bg-white/5 motion-safe:animate-pulse" /><div className="h-3 w-96 max-w-full rounded bg-white/5 motion-safe:animate-pulse" /></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="dark-card h-36 bg-white/[0.02] motion-safe:animate-pulse" />)}</div>
    <div className="grid gap-5 md:grid-cols-2">{[1, 2].map(item => <div key={item} className="dark-card h-40 bg-white/[0.02] motion-safe:animate-pulse" />)}</div>
  </main>;
}
