'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';
import type { JoinRequestStatus } from '../../types';

export type OrgJoinApproval = {
  id: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  message: string | null;
  status: JoinRequestStatus;
  createdAt: string;
};

type UseOrgJoinApprovalsResult = {
  approvals: OrgJoinApproval[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useOrgJoinApprovals(orgId: string | null): UseOrgJoinApprovalsResult {
  const [approvals, setApprovals] = useState<OrgJoinApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) {
      setApprovals([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('list_org_join_requests', {
      p_org_id: orgId,
    });
    if (rpcError) {
      setError(rpcError.message);
      setApprovals([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Array<{
      id: string;
      user_id: string;
      full_name: string | null;
      email: string | null;
      message: string | null;
      status: JoinRequestStatus;
      created_at: string;
    }>;
    setApprovals(
      rows
        .filter((row) => row.status === 'pending')
        .map((row) => ({
          id: row.id,
          userId: row.user_id,
          fullName: row.full_name ?? row.email ?? '—',
          email: row.email,
          message: row.message,
          status: row.status,
          createdAt: row.created_at,
        })),
    );
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return useMemo(
    () => ({
      approvals,
      loading,
      error,
      refresh,
    }),
    [approvals, loading, error, refresh],
  );
}
