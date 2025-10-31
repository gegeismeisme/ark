import { NextResponse, type NextRequest } from 'next/server';

import { ATTACHMENTS_BUCKET, parseAttachmentPath } from '../../../../lib/attachment-utils';
import { getUserFromRequest } from '../../../../lib/api-auth';
import { ensureOrgMember } from '../../../../lib/org-access';
import { getServiceSupabaseClient } from '../../../../lib/supabaseServiceRole';

type SignDownloadBody = {
  path?: string;
};

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabaseClient();

  let body: SignDownloadBody;
  try {
    body = (await request.json()) as SignDownloadBody;
  } catch {
    return NextResponse.json({ error: '请求体必须为 JSON。' }, { status: 400 });
  }

  const { path } = body;
  if (!path) {
    return NextResponse.json({ error: '缺少 path 字段。' }, { status: 422 });
  }

  const parsed = parseAttachmentPath(path);
  if (!parsed) {
    return NextResponse.json({ error: '附件路径无效。' }, { status: 400 });
  }

  let user;
  try {
    user = await getUserFromRequest(request, supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未授权。';
    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    await ensureOrgMember(supabase, parsed.organizationId, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '没有访问权限。';
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 120);

  if (error || !data) {
    return NextResponse.json(
      { error: '生成下载 URL 失败。', details: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    url: data.signedUrl,
    expiresIn: 120,
  });
}
