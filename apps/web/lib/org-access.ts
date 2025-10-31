import type { SupabaseClient } from '@supabase/supabase-js';

export async function ensureOrgMember(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('removed_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(`检查组织权限失败：${error.message}`);
  }

  if (!data) {
    throw new Error('您没有权限访问该组织的资源。');
  }
}
