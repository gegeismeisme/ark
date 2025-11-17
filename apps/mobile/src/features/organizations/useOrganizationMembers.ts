'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  fullName: string | null;
  displayName: string | null;
  displayNameLocked: boolean;
  role: string | null;
};

type UseOrganizationMembersResult = {
  members: OrganizationMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useOrganizationMembers(orgId: string | null): UseOrganizationMembersResult {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!orgId) {
      setMembers([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('organization_member_details')
      .select('id, organization_id, user_id, role, full_name, display_name, display_name_locked')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    if (queryError) {
      setMembers([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const mapped: OrganizationMember[] =
      (data ?? []).map((row) => ({
        id: (row as { id: string }).id,
        organizationId: (row as { organization_id: string }).organization_id,
        userId: (row as { user_id: string }).user_id,
        role: (row as { role: string | null }).role ?? null,
        fullName: (row as { full_name: string | null }).full_name,
        displayName: (row as { display_name: string | null }).display_name ?? null,
        displayNameLocked: Boolean((row as { display_name_locked?: boolean }).display_name_locked),
      })) ?? [];

    setMembers(mapped);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const refresh = useCallback(async () => {
    await loadMembers();
  }, [loadMembers]);

  return useMemo(
    () => ({
      members,
      loading,
      error,
      refresh,
    }),
    [members, loading, error, refresh],
  );
}
