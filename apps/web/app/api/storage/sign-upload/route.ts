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
    return jsonWithCors(request, { error: '\u8bf7\u6c42\u4f53\u5fc5\u987b\u662f JSON\u3002' }, { status: 400 });
  }

  const { taskId, fileName, contentType, size } = body;

  if (!taskId || !fileName || !contentType) {
    return jsonWithCors(
      request,
      { error: '\u7f3a\u5c11\u5fc5\u586b\u5b57\u6bb5\uff1ataskId\u3001fileName \u6216 contentType\u3002' },
      { status: 422 }
    );
  }

  if (!isAllowedContentType(contentType)) {
    return jsonWithCors(request, { error: '\u8be5\u6587\u4ef6\u7c7b\u578b\u4e0d\u53d7\u652f\u6301\u3002' }, { status: 415 });
  }

  if (typeof size === 'number' && size > ATTACHMENT_MAX_SIZE_BYTES) {
    const maxMb = Math.floor(ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024));
    return jsonWithCors(
      request,
      { error: `\u6587\u4ef6\u5927\u5c0f\u8d85\u8fc7\u9650\u5236\uff08\u6700\u5927 ${maxMb} MB\uff09\u3002` },
      { status: 413 }
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

  const objectPath = buildAttachmentPath(task.organization_id, task.id, fileName);

  const { data: signedData, error: signedError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(objectPath);

  if (signedError || !signedData) {
    return jsonWithCors(
      request,
      { error: '\u751f\u6210\u4e0a\u4f20 URL \u5931\u8d25\u3002', details: signedError?.message },
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
