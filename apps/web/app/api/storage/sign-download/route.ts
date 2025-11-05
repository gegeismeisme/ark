import { NextResponse, type NextRequest } from 'next/server';

import { ATTACHMENTS_BUCKET, parseAttachmentPath } from '../../../../lib/attachment-utils';
import { getUserFromRequest } from '../../../../lib/api-auth';
import { ensureOrgMember } from '../../../../lib/org-access';
import { getServiceSupabaseClient } from '../../../../lib/supabaseServiceRole';
import {
  handleCorsOptions,
  jsonWithCors,
  withCors,
} from '../../../../lib/cors';

type SignDownloadBody = {
  path?: string;
};

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabaseClient();

  let body: SignDownloadBody;
  try {
    body = (await request.json()) as SignDownloadBody;
  } catch {
    return jsonWithCors(request, { error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const { path } = body;
  if (!path) {
    return jsonWithCors(request, { error: 'The "path" field is required.' }, { status: 422 });
  }

  const parsed = parseAttachmentPath(path);
  if (!parsed) {
    return jsonWithCors(request, { error: 'Attachment path is invalid.' }, { status: 400 });
  }

  let user;
  try {
    user = await getUserFromRequest(request, supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Missing credentials for this request.';
    return jsonWithCors(request, { error: message }, { status: 401 });
  }

  try {
    await ensureOrgMember(supabase, parsed.organizationId, user.id);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'You do not have permission to access this organization.';
    return jsonWithCors(request, { error: message }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 120);

  if (error || !data) {
    return jsonWithCors(
      request,
      { error: 'Failed to generate a signed download URL.', details: error?.message },
      { status: 500 }
    );
  }

  return withCors(
    request,
    NextResponse.json({
      url: data.signedUrl,
      expiresIn: 120,
    })
  );
}
