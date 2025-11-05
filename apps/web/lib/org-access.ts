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
    throw new Error(`Failed to verify organization membership: ${error.message}`);
  }

  if (!data) {
    throw new Error('You do not have permission to access this organization.');
  }
}
