// CANONICAL: reminder queue processor. Fired daily at 12:00 UTC by the platform scheduler calling this route with Authorization: Bearer CRON_SECRET.
// rate-limit-exempt: the CRON_SECRET bearer check is the limiter for this endpoint.
// Email transport is not provisioned in the ecosystem env set; reminders surface in-product via GET /api/deadlines?reminder_due=true. Claiming (which sets reminder_sent_at) is gated behind MAILER_ENABLED=true so unsent reminders are never consumed before a mailer exists (QA-003).
import { createHash, timingSafeEqual } from 'node:crypto';

import { fail, ok, unexpected } from '@/lib/api/http';
import { listDueReminders, markRemindersSent } from '@/lib/db/deadlines';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// QA-037: timing-safe bearer check. Hash both sides to fixed-length buffers first
// (timingSafeEqual throws on length mismatch), then compare in constant time so
// the comparison leaks neither the secret's length nor any matching prefix.
function isAuthorizedBearer(header: string | null, secret: string): boolean {
  const provided = createHash('sha256').update(header ?? '').digest();
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
  return timingSafeEqual(provided, expected);
}

async function processReminders(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (!secret || !isAuthorizedBearer(header, secret)) {
    return fail(401, 'unauthorized', 'This endpoint accepts requests from the scheduler only.');
  }
  if (process.env.MAILER_ENABLED !== 'true') {
    // QA-003: no mailer is provisioned, so claiming would set reminder_sent_at without
    // any email actually being sent, permanently consuming the queue. Leave reminders
    // unclaimed so they still surface via GET /api/deadlines?reminder_due=true and will
    // email once a mailer is provisioned and MAILER_ENABLED=true is set.
    return ok({ processed: 0, mailer_enabled: false });
  }
  const endpoint = process.env.MAILER_ENDPOINT;
  const apiKey = process.env.MAILER_API_KEY;
  const from = process.env.MAILER_FROM;
  if (!endpoint || !apiKey || !from) {
    // MAILER_ENABLED=true but no transport is actually configured. Do NOT claim/send
    // (that would consume the queue with nothing delivered). Reminders keep surfacing
    // via GET /api/deadlines?reminder_due=true until a transport is provisioned.
    return ok({ processed: 0, sent: 0, mailer_enabled: true, transport_configured: false });
  }
  try {
    const service = createSupabaseServiceClient();
    const due = await listDueReminders(service);
    const sentIds: string[] = [];
    for (const reminder of due) {
      // RIP-QA-036: ReminderBatchItem's exported declaration changed in
      // lib/db/deadlines.ts; consume the new contract by destructuring its
      // typed fields (id, title, due_date, and the QA-044 email field) — no
      // casts. Rows without a deliverable address are skipped rather than
      // marked sent, and remain retryable.
      const { id, title, due_date, email } = reminder;
      if (!email) continue;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from,
            to: email,
            subject: `Reminder: ${title} is due ${due_date}`,
            text:
              `This is a reminder that "${title}" is due on ${due_date}.\n\n` +
              `Log in to your HomeschoolCompliance Pack calendar to review the details and required forms.`,
          }),
        });
        if (res.ok) {
          sentIds.push(id);
        }
      } catch {
        // Leave this reminder unclaimed so a later run retries it.
      }
    }
    if (sentIds.length > 0) {
      await markRemindersSent(service, sentIds);
    }
    return ok({
      processed: due.length,
      sent: sentIds.length,
      mailer_enabled: true,
      transport_configured: true,
    });
  } catch (error) {
    return unexpected('/api/cron/reminders', error);
  }
}

export async function POST(request: Request) {
  return processReminders(request);
}

export async function GET(request: Request) {
  return processReminders(request);
}
