// CANONICAL: root layout with self-hosted fonts (Law 113), skip link, and the ZoBeacon sense organ.
// [QA-010] Skip-link contract: the <a href="#main-content"> below is the first focusable element
// on every page. Any route rendered through this layout MUST expose exactly one
// <main id="main-content"> content landmark, or the link goes nowhere for keyboard and
// screen-reader users. The link itself is correct here; do not change its target.
import type { Metadata, Viewport } from 'next';
import './globals.css';
import ZoBeacon from '@/components/ZoBeacon';

// #100: a descendant reads URL search params (useSearchParams); opt this
// route out of static generation so `next build` does not CSR-bail.
export const dynamic = 'force-dynamic';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

export const metadata: Metadata = {
  title: 'HomeschoolCompliance Pack: your state homeschool deadlines, handled',
  description:
    'Pick your state and get a pre-filled notice of intent, a personal calendar of every required filing and testing date, and reminders two weeks before each deadline.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  twitter: {
    card: 'summary_large_image',
    title: 'HomeschoolCompliance Pack: your state homeschool deadlines, handled',
    description:
      'Pick your state and get a pre-filled notice of intent, a personal calendar of every required filing and testing date, and reminders two weeks before each deadline.',
  },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body className="font-body bg-slate-50 text-slate-900 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <ZoBeacon />
      </body>
    </html>
  );
}
