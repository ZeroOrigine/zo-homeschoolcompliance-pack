// CANONICAL: skeleton shown while dashboard routes stream in.
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <p className="sr-only" role="status">Loading your dashboard…</p>
      <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
    </div>
  );
}
