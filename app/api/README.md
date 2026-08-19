# HomeschoolCompliance Pack API

This step owns app/api except auth, checkout, billing, and webhook routes (those belong to the auth_payments step).

Envelope: every route returns JSON `{ data, error }`. Failures add a machine `code` and an optional `fields` map. HTTP status codes carry the semantics (400, 401, 402, 404, 429, 500).

Purpose beacon (Law 116):
- activation = a user generates their first state compliance calendar. Emitted server side in POST /api/deadlines/generate via lib/db/metrics.ts.
- page_view is collected by POST /api/zo (browser writable, page views only, query strings stripped).
- signup belongs in the auth callback and payment in the Stripe webhook. Both import emitProductMetric from lib/db/metrics.ts.

Scheduler: /api/cron/reminders runs daily at 12:00 UTC, fired by the platform scheduler with Authorization: Bearer CRON_SECRET. Email transport is not provisioned in the ecosystem env set, so reminders surface in-product (GET /api/deadlines?reminder_due=true). Marking reminder_sent_at keeps the queue idempotent for when a mailer is provisioned.

Paid gate: POST /api/deadlines, POST /api/deadlines/generate, and POST /api/documents return 402 with code payment_required until the one time Compliance Pack purchase clears (homeschoolcompliancepack_payments.status = succeeded, written by the service role webhook).
