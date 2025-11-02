import { randomUUID } from 'crypto';

import { NextResponse, type NextRequest } from 'next/server';

import {
  ATTACHMENT_MAX_SIZE_BYTES,
  ATTACHMENTS_BUCKET,
  isAllowedContentType,
} from '../../../../lib/attachment-utils';
import { getUserFromRequest } from '../../../../lib/api-auth';
import { ensureOrgMember } from '../../../../lib/org-access';
import { getServiceSupabaseClient } from '../../../../lib/supabaseServiceRole';
import {
  handleCorsOptions,
  jsonWithCors,
  withCors,
} from '../../../../lib/cors';

type SignUploadBody = {
  taskId?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
};

const sanitizeFileName = (fileName: string): string =>
  fileName
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128);

const buildAttachmentPath = (organizationId: string, taskId: string, fileName: string) => {
  const cleanName = sanitizeFileName(fileName);
  return `org/${organizationId}/task/${taskId}/${randomUUID()}-${cleanName}`;
};

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabaseClient();

  let body: SignUploadBody;
  try {
    body = (await request.json()) as SignUploadBody;
  } catch {
    return jsonWithCors(request, { error: '请求体必须是 JSON。' }, { status: 400 });
  }

  const { taskId, fileName, contentType, size } = body;

  if (!taskId || !fileName || !contentType) {
    return jsonWithCors(
      request,
      { error: '缺少必填字段：taskId、fileName 或 contentType。' },
      { status: 422 }
    );
  }

  if (!isAllowedContentType(contentType)) {
    return jsonWithCors(request, { error: '该文件类型不受支持。' }, { status: 415 });
  }

  if (typeof size === 'number' && size > ATTACHMENT_MAX_SIZE_BYTES) {
    const maxMb = Math.floor(ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024));
    return jsonWithCors(
      request,
      { error: `文件大小超出限制（最大 ${maxMb} MB）。` },
      { status: 413 }
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

  const objectPath = buildAttachmentPath(task.organization_id, task.id, fileName);

  const { data: signedData, error: signedError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(objectPath);

  if (signedError || !signedData) {
    return jsonWithCors(
      request,
      { error: '生成上传 URL 失败。', details: signedError?.message },
      { status: 500 }
    );
  }

  return withCors(
    request,
    NextResponse.json({
      url: signedData.signedUrl,
      path: objectPath,
      token: signedData.token,
      expiresIn: 60,
    })
  );
}
