// CANONICAL FAQ list for HomeschoolCompliance Pack marketing pages. Native details elements, zero JS.
// The paid price is threaded in from the server page (DB-sourced) so copy cannot desync from checkout.

const FAQ_ITEMS = (price: string) => [
  {
    q: 'Is this a subscription?',
    a: `No. The Compliance Pack is a one-time ${price} purchase. There is no membership, no renewal, and nothing to cancel. The free plan stays free.`,
  },
  {
    q: 'Which states are covered?',
    a: 'All 50 states and Washington DC. Requirements vary widely: some states ask for no notice at all, while others require notarized filings, attendance records, and annual testing. The pack shows exactly what your state expects.',
  },
  {
    q: 'What do I get on the free plan?',
    a: 'A plain-English summary of your state’s homeschool requirements and the filing and testing dates your state publishes. Enough to know exactly where you stand before you pay anything.',
  },
  {
    q: `What does the ${price} pack add?`,
    a: 'Three things: a notice of intent pre-filled with your details, a personal calendar of every required date for your school year, and dashboard reminders two weeks before each deadline.',
  },
  {
    q: 'Is this legal advice?',
    a: 'No. HomeschoolCompliance Pack turns published state requirements into documents, dates, and reminders. It is an organizational tool. For a legal dispute or a court matter, talk to an attorney.',
  },
  {
    q: 'I already filed this year. Is the pack still useful?',
    a: 'Yes. Filing is one date of many. Testing windows, attendance logs, and evaluations follow through the year, and the calendar and reminders carry you through all of them.',
  },
  {
    q: 'Do I need a credit card to start?',
    a: 'No. Create a free account, pick your state, and read your requirements. You pay only when you choose to buy the pack.',
  },
]

export default function FaqAccordion({ price = '$29' }: { price?: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {FAQ_ITEMS(price).map((item) => (
        <details
          key={item.q}
          className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden dark:text-white">
            <span>{item.q}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <p className="px-6 pb-6 text-slate-600 dark:text-slate-300">{item.a}</p>
        </details>
      ))}
    </div>
  )
}
