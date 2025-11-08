'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import { readCacheSnapshot, writeCacheSnapshot } from '@/lib/cache/local-db';
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
  const orgRef = useRef<string | null>(orgId);
  const userRef = useRef<string | null>(userId);

  useEffect(() => {
    orgRef.current = orgId;
  }, [orgId]);

  useEffect(() => {
    userRef.current = userId;
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!orgId || !userId) {
      setGroups([]);
      setSelectedId(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const targetOrgId = orgId;
    const targetUserId = userId;
    void readCacheSnapshot<Record<string, AdminGroup[]>>('taskGroups', targetOrgId).then(
      (cached) => {
        const cachedList = cached?.[targetUserId];
        if (cachedList && orgRef.current === targetOrgId && userRef.current === targetUserId) {
          setGroups(cachedList);
          setSelectedId((previous) => {
            if (previous && cachedList.some((group) => group.id === previous)) {
              return previous;
            }
            return cachedList[0]?.id ?? null;
          });
        }
      },
    );

    const { data, error: queryError } = await supabase
      .from('group_members')
      .select('group_id, groups!inner(id, name, organization_id)')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .eq('status', 'active')
      .is('removed_at', null)
      .eq('groups.organization_id', orgId)
      .order('created_at', { ascending: true });

    if (orgRef.current !== targetOrgId || userRef.current !== targetUserId) {
      return;
    }

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

    void (async () => {
      const existing =
        (await readCacheSnapshot<Record<string, AdminGroup[]>>('taskGroups', targetOrgId)) ?? {};
      existing[targetUserId] = mapped;
      await writeCacheSnapshot('taskGroups', existing, targetOrgId);
    })();
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
