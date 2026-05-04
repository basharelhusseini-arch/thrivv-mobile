export default function GymDashboardLoading() {
  return (
    <div className="min-h-screen bg-thrivv-bg-darker relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-1/3 -left-1/3 w-[60vw] h-[60vw] bg-thrivv-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/3 -right-1/3 w-[60vw] h-[60vw] bg-thrivv-gold-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-12 space-y-8">
        <div className="glass-card p-8 animate-pulse">
          <div className="h-4 w-24 bg-thrivv-bg-card rounded mb-4" />
          <div className="h-10 w-64 bg-thrivv-bg-card rounded mb-3" />
          <div className="h-4 w-48 bg-thrivv-bg-card rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 premium-card p-8 h-72 animate-pulse" />
          <div className="premium-card p-8 h-72 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="premium-card p-8 h-80 animate-pulse" />
          <div className="premium-card p-8 h-80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
