// CANONICAL closing call-to-action band shared by marketing pages.
import Link from 'next/link'

export default function CtaBand({
  heading,
  body,
  showPricingLink = true,
  price = '$29',
}: {
  heading: string
  body: string
  showPricingLink?: boolean
  price?: string
}) {
  return (
    <section className="bg-emerald-700 dark:bg-emerald-800">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{heading}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-emerald-50">{body}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:w-auto"
          >
            Start free
          </Link>
          {showPricingLink && (
            <Link
              href="/pricing"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-emerald-300/60 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-600 sm:w-auto"
            >
              See pricing
            </Link>
          )}
        </div>
        <p className="mt-5 text-sm text-emerald-100">Free plan available. No credit card required. The full pack is {price}, once.</p>
      </div>
    </section>
  )
}
