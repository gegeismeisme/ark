'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';

export type UserMembership = {
  id: string;
  organizationId: string;
  organizationName: string | null;
  role: string | null;
  displayName: string | null;
  visibility: string | null;
};

type UseUserMembershipsResult = {
  memberships: UserMembership[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useUserMemberships(userId: string | null): UseUserMembershipsResult {
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setMemberships([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('organization_members')
      .select(
        `
          id,
          organization_id,
          role,
          display_name,
          organizations (
            id,
            name,
            visibility
          )
        `,
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (queryError) {
      setMemberships([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const mapped =
      (data ?? []).map((row: any) => {
        const organization = Array.isArray(row.organizations)
          ? row.organizations[0] ?? null
          : row.organizations ?? null;
        return {
          id: row.id,
          organizationId: row.organization_id,
          organizationName: organization?.name ?? null,
          role: row.role ?? null,
          displayName: row.display_name ?? null,
          visibility: organization?.visibility ?? null,
        } satisfies UserMembership;
      }) ?? [];

    setMemberships(mapped);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`membership-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return useMemo(
    () => ({
      memberships,
      loading,
      error,
      refresh,
    }),
    [memberships, loading, error, refresh],
  );
}
