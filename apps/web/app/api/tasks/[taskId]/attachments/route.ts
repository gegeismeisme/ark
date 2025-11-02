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
    return jsonWithCors(request, { error: '请求体必须是 JSON。' }, { status: 400 });
  }

  const { fileName, filePath, contentType, size } = body;
  if (!fileName || !filePath || !contentType || typeof size !== 'number') {
    return jsonWithCors(
      request,
      { error: '缺少必填字段：fileName、filePath、contentType 或 size。' },
      { status: 422 }
    );
  }

  let user;
  try {
    user = await getUserFromRequest(request, supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : '缺少访问凭证。';
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
      { error: '查询任务失败。', details: taskError.message },
      { status: 500 }
    );
  }

  if (!task) {
    return jsonWithCors(request, { error: '任务不存在。' }, { status: 404 });
  }

  try {
    await ensureOrgMember(supabase, task.organization_id, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '没有访问该组织的权限。';
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
      { error: '保存附件信息失败。', details: insertError?.message },
      { status: 500 }
    );
  }

  return withCors(request, NextResponse.json({ attachment: inserted }));
}
