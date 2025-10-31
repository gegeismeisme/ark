import type { NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function getUserFromRequest(
  request: NextRequest,
  supabase: SupabaseClient,
): Promise<User> {
  const authorizationHeader = request.headers.get('authorization');
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new Error('缺少 Authorization 头部。');
  }

  const accessToken = authorizationHeader.slice('Bearer '.length).trim();
  if (!accessToken) {
    throw new Error('无效的 Authorization 头部。');
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    throw new Error('访问令牌已失效，请重新登录。');
  }

  return data.user;
}
