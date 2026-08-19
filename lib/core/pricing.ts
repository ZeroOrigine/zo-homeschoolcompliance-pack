// CANONICAL single source for the paid price label on marketing surfaces.
// The live price comes from homeschoolcompliancepack_plans via listPlans() —
// the same rows checkout charges against — so copy cannot silently desync.
import { listPlans } from '@/lib/db/catalog'

export const FALLBACK_PAID_PRICE_CENTS = 2900

export function formatUsd(cents: number): string {
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

/** Server-side: formatted paid-plan price from the DB, fallback if unreadable. */
export async function getPaidPriceLabel(): Promise<string> {
  try {
    const plans = await listPlans()
    const paid = plans.find((p) => p.key === 'complete' && p.is_active)
    if (paid && Number.isFinite(Number(paid.price_cents))) {
      return formatUsd(Number(paid.price_cents))
    }
  } catch {
    // fall through to the fallback label
  }
  return formatUsd(FALLBACK_PAID_PRICE_CENTS)
}
