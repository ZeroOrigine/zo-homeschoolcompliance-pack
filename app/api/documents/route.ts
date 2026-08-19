// CANONICAL: document collection routes (list plus pre-filled notice creation).
import { z } from 'zod';
import { enforceRateLimit, fail, getPagination, ok, parseWith, readJsonBody, requireUser, schoolYearSchema, stateCodeSchema, unexpected } from '@/lib/api/http';
import { DOCUMENT_TYPES } from '@/lib/db/constants';
import { getStateByCode } from '@/lib/db/catalog';
import {
  buildNoticeFields,
  createDocument,
  listDocuments,
  noticeFieldOverridesSchema,
  normalizeNoticeStudents,
  renderDocumentBody,
} from '@/lib/db/documents';
import { hasCompleteAccess } from '@/lib/db/entitlement';
import { getOrCreateProfile } from '@/lib/db/profiles';
import { listStudents } from '@/lib/db/students';

export const dynamic = 'force-dynamic';

const createDocumentSchema = z.object({
  doc_type: z
    .enum(DOCUMENT_TYPES, { errorMap: () => ({ message: 'Document type can be notice_of_intent or withdrawal_letter.' }) })
    .default('notice_of_intent'),
  school_year: schoolYearSchema,
  state_code: stateCodeSchema.optional(),
  title: z.string().trim().min(1, 'Titles cannot be empty.').max(200, 'Titles can be up to 200 characters.').optional(),
  fields: noticeFieldOverridesSchema.optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const pagination = getPagination(new URL(request.url));
    const { items, total } = await listDocuments(auth.supabase, auth.user.id, { from: pagination.from, to: pagination.to });
    return ok({ items, page: pagination.page, limit: pagination.limit, total });
  } catch (error) {
    return unexpected('GET /api/documents', error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const paid = await hasCompleteAccess(auth.user.id);
    if (!paid) {
      return fail(402, 'payment_required', 'Pre-filled notices unlock with the one time Compliance Pack purchase.');
    }
    const parsed = parseWith(createDocumentSchema, await readJsonBody(request));
    if (!parsed.ok) return parsed.response;
    const profile = await getOrCreateProfile(auth.supabase, auth.user);
    const stateCode = parsed.value.state_code ?? profile.state_code;
    if (!stateCode) {
      return fail(400, 'state_required', 'Pick your state first so we can pre-fill the right form.', { state_code: 'Pick your state first.' });
    }
    const state = await getStateByCode(stateCode);
    if (!state) {
      return fail(400, 'unknown_state', 'We could not find that state. Check the two letter code and try again.', { state_code: 'Unknown state code.' });
    }
    const { items: students } = await listStudents(auth.supabase, auth.user.id);
    const overrides = parsed.value.fields
      ? {
          parent_name: parsed.value.fields.parent_name,
          mailing_address: parsed.value.fields.mailing_address,
          school_district: parsed.value.fields.school_district,
          students: parsed.value.fields.students ? normalizeNoticeStudents(parsed.value.fields.students) : undefined,
        }
      : undefined;
    const fields = buildNoticeFields(profile, students, overrides);
    const body = renderDocumentBody(parsed.value.doc_type, state, parsed.value.school_year, fields);
    const defaultTitle =
      parsed.value.doc_type === 'withdrawal_letter'
        ? `${state.name} withdrawal letter ${parsed.value.school_year}`
        : `${state.name} notice of intent ${parsed.value.school_year}`;
    const document = await createDocument(auth.supabase, auth.user.id, {
      state_code: state.code,
      doc_type: parsed.value.doc_type,
      school_year: parsed.value.school_year,
      title: parsed.value.title ?? defaultTitle,
      fields,
      body,
    });
    return ok(document, 201);
  } catch (error) {
    return unexpected('POST /api/documents', error);
  }
}
