'use server';

import { NextResponse, type NextRequest } from 'next/server';

import { getUserFromRequest } from '../../../../../../lib/api-auth';
import { ensureOrgMember } from '../../../../../../lib/org-access';
import { ATTACHMENTS_BUCKET, parseAttachmentPath } from '../../../../../../lib/attachment-utils';
import { getServiceSupabaseClient } from '../../../../../../lib/supabaseServiceRole';
import {
  handleCorsOptions,
  jsonWithCors,
  withCors,
} from '../../../../../../lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ taskId: string; attachmentId: string }> },
) {
  const supabase = getServiceSupabaseClient();
  const { taskId, attachmentId } = await context.params;

  const { data: attachment, error: attachmentError } = await supabase
    .from('task_attachments')
    .select('id, task_id, organization_id, file_path')
    .eq('id', attachmentId)
    .maybeSingle();

  if (attachmentError) {
    return jsonWithCors(
      request,
      { error: 'Failed to load attachment record.', details: attachmentError.message },
      { status: 500 },
    );
  }

  if (!attachment) {
    return jsonWithCors(request, { error: 'Attachment not found.' }, { status: 404 });
  }

  if (attachment.task_id !== taskId) {
    return jsonWithCors(request, { error: 'Attachment does not belong to this task.' }, { status: 400 });
  }

  let user;
  try {
    user = await getUserFromRequest(request, supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Missing access token.';
    return jsonWithCors(request, { error: message }, { status: 401 });
  }

  try {
    await ensureOrgMember(supabase, attachment.organization_id, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'You do not have permission to modify this organization.';
    return jsonWithCors(request, { error: message }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId);

  if (deleteError) {
    return jsonWithCors(
      request,
      { error: 'Failed to delete attachment record.', details: deleteError.message },
      { status: 500 },
    );
  }

  const parsedPath = parseAttachmentPath(attachment.file_path);
  if (parsedPath) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([parsedPath.path]).catch((err) => {
      console.error('[attachments] remove object failed', err);
    });
  }

  return withCors(request, NextResponse.json({ success: true }));
}
