import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';

export type OrganizationGroup = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
  isDefault: boolean;
};

type UseOrganizationGroupsResult = {
  groups: OrganizationGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

type RawGroupRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  group_members?: Array<{ count?: number }>;
};

export function useOrganizationGroups(organizationId: string | null): UseOrganizationGroupsResult {
  const [groups, setGroups] = useState<OrganizationGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setGroups([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('groups')
      .select('id,name,description,created_at,group_members:group_members(count)')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (queryError) {
      setError(queryError.message);
      setGroups([]);
      setLoading(false);
      return;
    }

    const mapped = (data as RawGroupRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      memberCount: row.group_members?.[0]?.count ?? 0,
      isDefault: false,
    }));

    if (mapped.length > 0) {
      mapped[0].isDefault = true;
    }

    setGroups(mapped);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return useMemo(
    () => ({
      groups,
      loading,
      error,
      refresh,
    }),
    [groups, loading, error, refresh],
  );
}
