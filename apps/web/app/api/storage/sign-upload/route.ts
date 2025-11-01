import { NextResponse, type NextRequest } from 'next/server';

import {
  ATTACHMENT_MAX_SIZE_BYTES,
  ATTACHMENTS_BUCKET,
  buildAttachmentPath,
  isAllowedContentType,
} from '../../../../lib/attachment-utils';
import { getUserFromRequest } from '../../../../lib/api-auth';
import { ensureOrgMember } from '../../../../lib/org-access';
import { getServiceSupabaseClient } from '../../../../lib/supabaseServiceRole';

type SignUploadBody = {
  taskId?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
};

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabaseClient();

  let body: SignUploadBody;
  try {
    body = (await request.json()) as SignUploadBody;
  } catch {
    return NextResponse.json({ error: '请求体必须为 JSON。' }, { status: 400 });
  }

  const { taskId, fileName, contentType, size } = body;

  if (!taskId || !fileName || !contentType) {
    return NextResponse.json(
      { error: '缺少 taskId、fileName 或 contentType。' },
      { status: 422 },
    );
  }

  if (!isAllowedContentType(contentType)) {
    return NextResponse.json({ error: '文件类型不被允许。' }, { status: 415 });
  }

  if (typeof size === 'number' && size > ATTACHMENT_MAX_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `文件大小超出限制（最大 ${
          Math.floor(ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024))
        } MB）。`,
      },
      { status: 413 },
    );
  }

  let user;
  try {
    user = await getUserFromRequest(request, supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未授权。';
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, organization_id')
    .eq('id', taskId)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json(
      { error: '查询任务失败。', details: taskError.message },
      { status: 500 },
    );
  }

  if (!task) {
    return NextResponse.json({ error: '任务不存在。' }, { status: 404 });
  }

  try {
    await ensureOrgMember(supabase, task.organization_id, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '没有访问权限。';
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const objectPath = buildAttachmentPath(task.organization_id, task.id, fileName);

  const { data: signedData, error: signedError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(objectPath, 60, {
      contentType,
    });

  if (signedError || !signedData) {
    return NextResponse.json(
      { error: '生成上传 URL 失败。', details: signedError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    url: signedData.signedUrl,
    path: objectPath,
    token: signedData.token,
    expiresIn: 60,
  });
}
