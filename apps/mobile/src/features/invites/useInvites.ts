import { useCallback, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';
import type { JoinRequest, JoinRequestRow } from '../../types';

type UseInvitesResult = {
  joinRequests: JoinRequest[];
  loading: boolean;
  error: string | null;
  loadJoinRequests: () => Promise<void>;
  redeemCode: string;
  setRedeemCode: (value: string) => void;
  redeemLoading: boolean;
  redeemMessage: string | null;
  redeemError: string | null;
  redeemInvite: () => Promise<void>;
};

export function useInvites(session: Session | null): UseInvitesResult {
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const loadJoinRequests = useCallback(async () => {
    if (!session?.user) {
      setJoinRequests([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('organization_join_requests')
      .select(
        `
          id,
          organization_id,
          status,
          message,
          created_at,
          reviewed_at,
          response_note,
          organizations ( id, name )
        `
      )
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (queryError) {
      setJoinRequests([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const mapped =
      (data ?? []).map((row: JoinRequestRow) => {
        const organizationRaw = row.organizations;
        const organization =
          Array.isArray(organizationRaw)
            ? organizationRaw[0] ?? null
            : organizationRaw ?? null;
        return {
          id: row.id,
          organizationId: row.organization_id,
          organizationName: organization?.name ?? null,
          status: row.status,
          message: row.message,
          createdAt: row.created_at,
          reviewedAt: row.reviewed_at,
          responseNote: row.response_note,
        } satisfies JoinRequest;
      }) ?? [];

    setJoinRequests(mapped);
    setLoading(false);
  }, [session?.user]);

  const redeemInvite = useCallback(async () => {
    const trimmed = redeemCode.trim();
    if (!trimmed) {
      setRedeemError('请输入有效的邀请码');
      return;
    }

    if (!session?.user) {
      setRedeemError('请先登录后再使用邀请码');
      return;
    }

    setRedeemLoading(true);
    setRedeemError(null);
    setRedeemMessage(null);

    const { data, error: rpcError } = await supabase.rpc('redeem_org_invite', {
      p_code: trimmed,
    });

    setRedeemLoading(false);

    if (rpcError) {
      setRedeemError(rpcError.message);
      return;
    }

    const organizationId =
      Array.isArray(data) && data.length > 0 ? data[0]?.organization_id ?? null : null;
    setRedeemMessage(
      organizationId
        ? '邀请码使用成功，已加入对应组织。'
        : '邀请码使用成功。'
    );
    setRedeemCode('');
    void loadJoinRequests();
  }, [loadJoinRequests, redeemCode, session?.user]);

  return {
    joinRequests,
    loading,
    error,
    loadJoinRequests,
    redeemCode,
    setRedeemCode,
    redeemLoading,
    redeemMessage,
    redeemError,
    redeemInvite,
  };
}
