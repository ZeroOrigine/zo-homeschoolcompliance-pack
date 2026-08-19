// CANONICAL robots policy: index the marketing surface, keep app + API private (QA-014).
import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homeschoolcompliancepack.zeroorigine.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api', '/settings', '/billing', '/calendar', '/documents', '/students'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
