'use client';
// CANONICAL: root-level error boundary covering marketing and auth routes
// (the dashboard group has its own). Friendly, recoverable, no data lost.
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Something went sideways on our end</h1>
        <p className="mt-2 text-sm text-slate-600">Nothing was lost. Try loading this again, it usually clears right up.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
