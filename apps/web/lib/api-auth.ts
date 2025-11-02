import type { NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const MISSING_AUTH_HEADER_MESSAGE = '缺少 Authorization 请求头。';
const INVALID_AUTH_HEADER_MESSAGE = '无效的 Authorization 请求头。';
const TOKEN_EXPIRED_MESSAGE = '访问令牌已失效，请重新登录。';

export async function getUserFromRequest(
  request: NextRequest,
  supabase: SupabaseClient,
): Promise<User> {
  const authorizationHeader = request.headers.get('authorization');
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new Error(MISSING_AUTH_HEADER_MESSAGE);
  }

  const accessToken = authorizationHeader.slice('Bearer '.length).trim();
  if (!accessToken) {
    throw new Error(INVALID_AUTH_HEADER_MESSAGE);
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    throw new Error(TOKEN_EXPIRED_MESSAGE);
  }

  return data.user;
}
