'use client';
// CANONICAL: dashboard chrome: desktop sidebar, mobile drawer with iOS-safe scroll lock, closes on navigation.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {d.split('|').map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

const NAV: Array<{ href: string; label: string; icon: ReactNode }> = [
  { href: '/dashboard', label: 'Dashboard', icon: <Icon d="M3 10.5 12 3l9 7.5|M5 9.5V21h14V9.5" /> },
  { href: '/calendar', label: 'Calendar', icon: <Icon d="M8 3v4M16 3v4|M4 7h16|M4 7v13h16V7" /> },
  { href: '/documents', label: 'Documents', icon: <Icon d="M7 3h7l5 5v13H7z|M14 3v5h5" /> },
  { href: '/students', label: 'Students', icon: <Icon d="M16 21v-1a4 4 0 0 0-8 0v1|M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8" /> },
  { href: '/settings', label: 'Settings', icon: <Icon d="M6 4v6m0 4v6|M12 4v2m0 4v10|M18 4v10m0 4v2|M4 10h4M10 6h4M16 14h4" /> },
  { href: '/billing', label: 'Billing', icon: <Icon d="M3 6h18v13H3z|M3 10h18" /> },
];

function Brand() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
        <Icon d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3|M9 12l2 2 4-4" />
      </span>
      <span className="font-display text-sm font-bold leading-tight text-slate-900">
        HomeschoolCompliance
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Pack</span>
      </span>
    </span>
  );
}

export default function DashboardShell({
  email,
  fullName,
  paid,
  children,
}: {
  email: string;
  fullName: string;
  paid: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const container = drawerRef.current;
    container?.querySelector<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])')?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    const y = window.scrollY;
    const { style } = document.body;
    style.position = 'fixed';
    style.top = `-${y}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    return () => {
      style.position = '';
      style.top = '';
      style.left = '';
      style.right = '';
      style.width = '';
      window.scrollTo(0, y);
      document.removeEventListener('keydown', onKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } catch {}
    window.location.assign('/login');
  }

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                active ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  function UserBox() {
    return (
      <div className="border-t border-slate-200 px-4 py-4">
        <p className="truncate text-sm font-medium text-slate-900">{fullName || 'Homeschool parent'}</p>
        <p className="truncate text-xs text-slate-500">{email}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          {paid ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">Pack owner</span>
          ) : (
            <Link href="/billing" className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100">
              Free preview: unlock
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-60"
          >
            {signingOut ? 'Signing out' : 'Sign out'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="px-5 py-5">
          <Link href="/dashboard" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
            <Brand />
          </Link>
        </div>
        <NavLinks />
        <UserBox />
      </aside>

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/dashboard">
          <Brand />
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          <Icon d="M4 6h16|M4 12h16|M4 18h16" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-900/50" />
          <div ref={drawerRef} className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <Brand />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <Icon d="M6 6l12 12|M18 6L6 18" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <UserBox />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
