'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminGroup, AdminGroupRow } from '../../types';

type UseGroupsStateArgs = {
  supabase: SupabaseClient;
  orgId: string | null;
  userId: string | null;
};

type UseGroupsStateResult = {
  list: AdminGroup[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  select: (groupId: string | null) => void;
  selectedGroup: AdminGroup | null;
  refresh: () => Promise<void>;
};

function mapGroupRow(row: AdminGroupRow): AdminGroup | null {
  if (!row.groups) return null;
  if (Array.isArray(row.groups)) {
    const first = row.groups[0];
    if (!first) return null;
    return { id: first.id, name: first.name };
  }
  return { id: row.groups.id, name: row.groups.name };
}

export function useGroupsState({ supabase, orgId, userId }: UseGroupsStateArgs): UseGroupsStateResult {
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!orgId || !userId) {
      setGroups([]);
      setSelectedId(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('group_members')
      .select('group_id, groups!inner(id, name, organization_id)')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .eq('status', 'active')
      .is('removed_at', null)
      .eq('groups.organization_id', orgId)
      .order('created_at', { ascending: true });

    if (queryError) {
      setGroups([]);
      setLoading(false);
      setError(queryError.message);
      return;
    }

    const mapped =
      (data ?? [])
        .map((row) => mapGroupRow(row as AdminGroupRow))
        .filter((item): item is AdminGroup => Boolean(item)) ?? [];

    setGroups(mapped);
    setLoading(false);

    setSelectedId((previous) => {
      if (previous && mapped.some((item) => item.id === previous)) {
        return previous;
      }
      return mapped[0]?.id ?? null;
    });
  }, [orgId, supabase, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedId) ?? null,
    [groups, selectedId]
  );

  return {
    list: groups,
    loading,
    error,
    selectedId,
    select: setSelectedId,
    selectedGroup,
    refresh,
  };
}
