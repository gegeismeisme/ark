'use server';

import { NextResponse, type NextRequest } from 'next/server';

import { getUserFromRequest } from '../../../../../lib/api-auth';
import { ensureOrgMember } from '../../../../../lib/org-access';
import { getServiceSupabaseClient } from '../../../../../lib/supabaseServiceRole';
import {
  handleCorsOptions,
  jsonWithCors,
  withCors,
} from '../../../../../lib/cors';

type CreateAttachmentBody = {
  fileName?: string;
  filePath?: string;
  contentType?: string;
  size?: number;
};

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  const supabase = getServiceSupabaseClient();
  const { taskId } = await context.params;

  let body: CreateAttachmentBody;
  try {
    body = (await request.json()) as CreateAttachmentBody;
  } catch {
    return jsonWithCors(request, { error: '\u8bf7\u6c42\u4f53\u5fc5\u987b\u662f JSON\u3002' }, { status: 400 });
  }

  const { fileName, filePath, contentType, size } = body;
  if (!fileName || !filePath || !contentType || typeof size !== 'number') {
    return jsonWithCors(
      request,
      { error: '\u7f3a\u5c11\u5fc5\u586b\u5b57\u6bb5\uff1afileName\u3001filePath\u3001contentType \u6216 size\u3002' },
      { status: 422 }
    );
  }

  let user;
  try {
    user = await getUserFromRequest(request, supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : '\u7f3a\u5c11\u8bbf\u95ee\u51ed\u8bc1\u3002';
    return jsonWithCors(request, { error: message }, { status: 401 });
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, organization_id')
    .eq('id', taskId)
    .maybeSingle();

  if (taskError) {
    return jsonWithCors(
      request,
      { error: '\u67e5\u8be2\u4efb\u52a1\u5931\u8d25\u3002', details: taskError.message },
      { status: 500 }
    );
  }

  if (!task) {
    return jsonWithCors(request, { error: '\u4efb\u52a1\u4e0d\u5b58\u5728\u3002' }, { status: 404 });
  }

  try {
    await ensureOrgMember(supabase, task.organization_id, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '\u6ca1\u6709\u8bbf\u95ee\u8be5\u7ec4\u7ec7\u7684\u6743\u9650\u3002';
    return jsonWithCors(request, { error: message }, { status: 403 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      organization_id: task.organization_id,
      uploaded_by: user.id,
      file_name: fileName,
      file_path: filePath,
      content_type: contentType,
      size_bytes: size,
    })
    .select(
      'id, task_id, organization_id, uploaded_by, file_name, file_path, content_type, size_bytes, uploaded_at'
    )
    .single();

  if (insertError || !inserted) {
    return jsonWithCors(
      request,
      { error: '\u4fdd\u5b58\u9644\u4ef6\u4fe1\u606f\u5931\u8d25\u3002', details: insertError?.message },
      { status: 500 }
    );
  }

  return withCors(request, NextResponse.json({ attachment: inserted }));
}
