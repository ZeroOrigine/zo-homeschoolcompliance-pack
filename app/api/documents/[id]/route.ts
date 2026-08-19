// CANONICAL: single document routes (edit fields, regenerate body, finalize, delete).
import { z } from 'zod';
import { enforceRateLimit, fail, ok, parseWith, readJsonBody, requireUser, unexpected } from '@/lib/api/http';
import { DOCUMENT_STATUSES, isUuid } from '@/lib/db/constants';
import { getStateByCode } from '@/lib/db/catalog';
import {
  asNoticeFields,
  deleteDocument,
  getDocument,
  noticeFieldOverridesSchema,
  normalizeNoticeStudents,
  renderDocumentBody,
  updateDocument,
  type DocumentUpdate,
  type NoticeFields,
} from '@/lib/db/documents';

export const dynamic = 'force-dynamic';

const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1, 'Titles cannot be empty.').max(200, 'Titles can be up to 200 characters.').optional(),
    fields: noticeFieldOverridesSchema.optional(),
    body: z.string().max(20000, 'Document text can be up to 20000 characters.').optional(),
    status: z.enum(DOCUMENT_STATUSES, { errorMap: () => ({ message: 'Status can be draft or finalized.' }) }).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to update.' });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return fail(400, 'invalid_id', 'That document id is not valid.');
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const document = await getDocument(auth.supabase, auth.user.id, params.id);
    if (!document) return fail(404, 'document_not_found', 'We could not find that document on your account.');
    return ok(document);
  } catch (error) {
    return unexpected('GET /api/documents/[id]', error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return fail(400, 'invalid_id', 'That document id is not valid.');
    const limited = await enforceRateLimit(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const parsed = parseWith(updateDocumentSchema, await readJsonBody(request));
    if (!parsed.ok) return parsed.response;
    const existing = await getDocument(auth.supabase, auth.user.id, params.id);
    if (!existing) return fail(404, 'document_not_found', 'We could not find that document on your account.');
    if (
      existing.status === 'finalized' &&
      parsed.value.status !== 'draft' &&
      (parsed.value.title !== undefined || parsed.value.fields !== undefined || parsed.value.body !== undefined)
    ) {
      return fail(409, 'document_finalized', 'This document is finalized. Set status back to draft in the same request to edit it.');
    }

    const patch: DocumentUpdate = {};
    if (parsed.value.title !== undefined) patch.title = parsed.value.title;
    if (parsed.value.status !== undefined) patch.status = parsed.value.status;
    if (parsed.value.body !== undefined) patch.body = parsed.value.body;
    if (parsed.value.fields) {
      const current = asNoticeFields(existing.fields);
      const merged: NoticeFields = {
        parent_name: parsed.value.fields.parent_name ?? current.parent_name,
        mailing_address: parsed.value.fields.mailing_address ?? current.mailing_address,
        school_district: parsed.value.fields.school_district ?? current.school_district,
        students: parsed.value.fields.students ? normalizeNoticeStudents(parsed.value.fields.students) : current.students,
      };
      patch.fields = merged;
      if (parsed.value.body === undefined) {
        const state = await getStateByCode(existing.state_code);
        if (state) patch.body = renderDocumentBody(existing.doc_type, state, existing.school_year, merged);
      }
    }
    const document = await updateDocument(auth.supabase, auth.user.id, params.id, patch);
    if (!document) return fail(404, 'document_not_found', 'We could not find that document on your account.');
    return ok(document);
  } catch (error) {
    return unexpected('PATCH /api/documents/[id]', error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return fail(400, 'invalid_id', 'That document id is not valid.');
    const limited = await enforceRateLimit(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const deleted = await deleteDocument(auth.supabase, auth.user.id, params.id);
    if (!deleted) return fail(404, 'document_not_found', 'We could not find that document on your account.');
    return ok({ deleted: true });
  } catch (error) {
    return unexpected('DELETE /api/documents/[id]', error);
  }
}
