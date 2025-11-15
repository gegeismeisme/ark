import { useCallback, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';
import { t } from '../../i18n';
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

type LoadJoinRequestsDeps = {
  session: Session | null;
  supabaseClient: typeof supabase;
  setJoinRequests: (requests: JoinRequest[]) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
};

export async function loadJoinRequestsImpl({
  session,
  supabaseClient,
  setJoinRequests,
  setLoading,
  setError,
}: LoadJoinRequestsDeps) {
  if (!session?.user) {
    setJoinRequests([]);
    return;
  }

  setLoading(true);
  setError(null);

  const { data, error } = await supabaseClient
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

  if (error) {
    setJoinRequests([]);
    setError(error.message);
    setLoading(false);
    return;
  }

  let mapped =
    (data ?? []).map((row: JoinRequestRow) => {
      const organizationRaw = row.organizations;
      const organization = Array.isArray(organizationRaw) ? organizationRaw[0] ?? null : organizationRaw ?? null;
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

  const MAX_HISTORY = 10;
  if (mapped.length > MAX_HISTORY) {
    const surplus = mapped.slice(MAX_HISTORY);
    const surplusIds = surplus.map((request) => request.id);
    mapped = mapped.slice(0, MAX_HISTORY);
    if (surplusIds.length > 0) {
      await supabaseClient
        .from('organization_join_requests')
        .delete()
        .in('id', surplusIds)
        .eq('user_id', session.user.id);
    }
  }

  setJoinRequests(mapped);
  setLoading(false);
}

type RedeemInviteDeps = {
  session: Session | null;
  supabaseClient: typeof supabase;
  redeemCode: string;
  setRedeemCode: (value: string) => void;
  setRedeemLoading: (value: boolean) => void;
  setRedeemMessage: (value: string | null) => void;
  setRedeemError: (value: string | null) => void;
  reloadRequests: () => void;
};

export async function redeemInviteImpl({
  session,
  supabaseClient,
  redeemCode,
  setRedeemCode,
  setRedeemLoading,
  setRedeemMessage,
  setRedeemError,
  reloadRequests,
}: RedeemInviteDeps) {
  const trimmed = redeemCode.trim();
  if (!trimmed) {
    setRedeemError(t('invite.error.invalidCode'));
    return;
  }

  if (!session?.user) {
    setRedeemError(t('invite.error.authRequired'));
    return;
  }

  setRedeemLoading(true);
  setRedeemError(null);
  setRedeemMessage(null);

  const { data, error } = await supabaseClient.rpc('redeem_org_invite', {
    p_code: trimmed,
  });

  setRedeemLoading(false);

  if (error) {
    setRedeemError(error.message);
    return;
  }

  const organizationId =
    Array.isArray(data) && data.length > 0 ? data[0]?.organization_id ?? null : null;
  setRedeemMessage(
    organizationId ? t('invite.success.joined') : t('invite.success.pending'),
  );
  setRedeemCode('');
  reloadRequests();
}

export function useInvites(session: Session | null): UseInvitesResult {
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const loadJoinRequests = useCallback(
    () =>
      loadJoinRequestsImpl({
        session,
        supabaseClient: supabase,
        setJoinRequests,
        setLoading,
        setError,
      }),
    [session, setJoinRequests, setLoading, setError]
  );

  const redeemInvite = useCallback(
    () =>
      redeemInviteImpl({
        session,
        supabaseClient: supabase,
        redeemCode,
        setRedeemCode,
        setRedeemLoading,
        setRedeemMessage,
        setRedeemError,
        reloadRequests: () => {
          void loadJoinRequests();
        },
      }),
    [loadJoinRequests, redeemCode, session, setRedeemCode, setRedeemLoading, setRedeemMessage, setRedeemError]
  );

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
