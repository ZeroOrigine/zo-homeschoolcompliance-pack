'use client';
// CANONICAL: dashboard-level error boundary with a friendly retry.
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Something went sideways on our end</h2>
      <p className="mt-2 text-sm text-slate-600">Your data is safe. Try loading this page again, it usually clears right up.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        Try again
      </button>
    </div>
  );
}
