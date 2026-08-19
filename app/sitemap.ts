// CANONICAL sitemap for the public marketing surface (QA-014).
import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homeschoolcompliancepack.zeroorigine.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return ['/', '/pricing', '/about', '/login', '/signup'].map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
