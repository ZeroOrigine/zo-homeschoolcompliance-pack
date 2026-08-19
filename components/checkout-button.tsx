'use client';
// CANONICAL: starts the one time Compliance Pack checkout via the central payments route.
import { useState } from 'react';

export default function CheckoutButton({ planKey, label }: { planKey: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_key: planKey }),
      });
      const body = (await res.json().catch(() => null)) as { data?: { url?: string }; url?: string; error?: string } | null;
      const url = body?.data?.url ?? body?.url;
      if (res.ok && url) {
        window.location.assign(url);
        return;
      }
      setErr(body?.error ?? 'Checkout could not start. Please try again.');
      setBusy(false);
    } catch {
      setErr('We could not reach checkout. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60"
      >
        {busy ? 'Opening checkout' : label}
      </button>
      {err && <p className="mt-2 text-sm text-rose-600" role="alert">{err}</p>}
    </div>
  );
}
