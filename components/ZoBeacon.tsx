'use client';
// CANONICAL: page-view sense organ (Law 197). Posts page views to the local /api/zo
// collector on route changes. zoEvent is exported for optimistic client hints; the
// collector ignores everything except page_view (purpose events are server-side, Law 116).
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export type ZoEventName = 'page_view' | 'signup' | 'activation' | 'payment';

export function zoEvent(event: ZoEventName, path?: string): void {
  try {
    const payload = JSON.stringify({ event, path: path ?? window.location.pathname });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/zo', new Blob([payload], { type: 'application/json' }));
      return;
    }
    void fetch('/api/zo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // A beacon must never break the page.
  }
}

export default function ZoBeacon() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    zoEvent('page_view', pathname);
  }, [pathname]);

  return null;
}
