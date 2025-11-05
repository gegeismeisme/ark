'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from '@/lib/i18n/client';

import { supabase } from '../../../../lib/supabaseClient';
import { useOrgContext } from '../../org-provider';
import type {
  InviteRow,
  JoinRequestRow,
  MemberRow,
  MemberStatus,
  OrgRole,
  OrgVisibility,
} from '../types';

function generateInviteCode(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

export function useMembersDashboard() {
  const t = useTranslations();
  const { activeOrg, user, organizationsLoading, refreshOrganizations } = useOrgContext();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [orgVisibility, setOrgVisibility] = useState<OrgVisibility>('public');
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteNote, setInviteNote] = useState('');
  const [inviteExpires, setInviteExpires] = useState<'7' | '30' | '0'>('7');
  const [inviteQuota, setInviteQuota] = useState<'1' | '5' | '20' | '0'>('1');
  const [creatingInvite, setCreatingInvite] = useState(false);

  const [joinRequests, setJoinRequests] = useState<JoinRequestRow[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestError, setJoinRequestError] = useState<string | null>(null);
  const [processingRequestIds, setProcessingRequestIds] = useState<Set<string>>(new Set());

  const orgId = activeOrg?.id ?? null;
  const isAdmin = useMemo(
    () => activeOrg?.role === 'owner' || activeOrg?.role === 'admin',
    [activeOrg?.role],
  );

  const refreshMembers = useCallback(async () => {
    if (!orgId) {
      setMembers([]);
      return;
    }

    setMembersLoading(true);
    setMembersError(null);

    const { data, error } = await supabase
      .from('organization_member_details')
      .select('id, user_id, role, status, joined_at, invited_at, full_name')
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setMembers([]);
      setMembersError(error.message);
      setMembersLoading(false);
      return;
    }

    const mapped: MemberRow[] =
      (data ?? []).map((row) => ({
        id: row.id as string,
        userId: (row as { user_id: string }).user_id,
        role: (row as { role: OrgRole }).role,
        status: (row as { status: MemberStatus }).status,
        joinedAt: (row as { joined_at: string | null }).joined_at,
        invitedAt: (row as { invited_at: string | null }).invited_at,
        fullName: (row as { full_name: string | null }).full_name,
      })) ?? [];

    setMembers(mapped);
    setMembersLoading(false);
  }, [orgId]);

  const refreshVisibility = useCallback(async () => {
    if (!orgId) {
      setOrgVisibility('public');
      return;
    }

    setVisibilityLoading(true);
    setVisibilityError(null);

    const { data, error } = await supabase
      .from('organizations')
      .select('visibility')
      .eq('id', orgId)
      .maybeSingle();

    if (error) {
      setVisibilityError(error.message);
      setVisibilityLoading(false);
      return;
    }

    if (data?.visibility) {
      setOrgVisibility(data.visibility as OrgVisibility);
    }
    setVisibilityLoading(false);
  }, [orgId]);

  const refreshInvites = useCallback(async () => {
    if (!orgId || !isAdmin) {
      setInvites([]);
      return;
    }

    setInvitesLoading(true);
    setInviteError(null);

    const { data, error } = await supabase
      .from('organization_invites')
      .select('id, code, note, created_at, expires_at, max_uses, use_count, revoked_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      setInvites([]);
      setInviteError(error.message);
      setInvitesLoading(false);
      return;
    }

    const mapped: InviteRow[] =
      (data ?? []).map((row) => ({
        id: row.id as string,
        code: row.code as string,
        note: (row as { note: string | null }).note,
        createdAt: (row as { created_at: string }).created_at,
        expiresAt: (row as { expires_at: string | null }).expires_at,
        maxUses: (row as { max_uses: number | null }).max_uses,
        useCount: (row as { use_count: number }).use_count,
        revokedAt: (row as { revoked_at: string | null }).revoked_at,
      })) ?? [];

    setInvites(mapped);
    setInvitesLoading(false);
  }, [isAdmin, orgId]);

  const refreshJoinRequests = useCallback(async () => {
    if (!orgId || !isAdmin) {
      setJoinRequests([]);
      return;
    }

    setJoinRequestsLoading(true);
    setJoinRequestError(null);

    const { data, error } = await supabase.rpc('list_org_join_requests', {
      p_org_id: orgId,
    });

    if (error) {
      setJoinRequests([]);
      setJoinRequestError(error.message);
      setJoinRequestsLoading(false);
      return;
    }

    const mapped: JoinRequestRow[] =
      (data ?? []).map((row) => ({
        id: row.id as string,
        userId: (row as { user_id: string }).user_id,
        fullName: (row as { full_name: string | null }).full_name,
        email: (row as { email: string | null }).email,
        message: (row as { message: string | null }).message,
        status: (row as { status: JoinRequestRow['status'] }).status,
        createdAt: (row as { created_at: string }).created_at,
        reviewedAt: (row as { reviewed_at: string | null }).reviewed_at,
        responseNote: (row as { response_note: string | null }).response_note,
      })) ?? [];

    setJoinRequests(mapped);
    setJoinRequestsLoading(false);
  }, [isAdmin, orgId]);

  useEffect(() => {
    void refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    void refreshVisibility();
    void refreshInvites();
    void refreshJoinRequests();
  }, [refreshInvites, refreshJoinRequests, refreshVisibility]);

  const disableRoleChange = useCallback(
    (member: MemberRow) => member.role === 'owner' || member.userId === user?.id,
    [user?.id],
  );

  const disableStatusChange = useCallback(
    (member: MemberRow) => member.role === 'owner' || member.userId === user?.id,
    [user?.id],
  );

  const handleRoleChange = useCallback(
    async (member: MemberRow, nextRole: OrgRole) => {
      if (!orgId) return;
      if (member.role === nextRole || disableRoleChange(member)) return;

      setUpdatingId(member.id);
      setActionError(null);

      const { error } = await supabase
        .from('organization_members')
        .update({ role: nextRole })
        .eq('id', member.id);

      if (error) {
        setActionError(error.message);
        setUpdatingId(null);
        return;
      }

      setMembers((prev) =>
        prev.map((row) => (row.id === member.id ? { ...row, role: nextRole } : row)),
      );
      setUpdatingId(null);
    },
    [disableRoleChange, orgId],
  );

  const handleStatusChange = useCallback(
    async (member: MemberRow, nextStatus: MemberStatus) => {
      if (!orgId) return;
      if (member.status === nextStatus || disableStatusChange(member)) return;

      setUpdatingId(member.id);
      setActionError(null);

      const { error } = await supabase
        .from('organization_members')
        .update({
          status: nextStatus,
          removed_at: nextStatus === 'removed' ? new Date().toISOString() : null,
        })
        .eq('id', member.id);

      if (error) {
        setActionError(error.message);
        setUpdatingId(null);
        return;
      }

      setMembers((prev) =>
        prev.map((row) => (row.id === member.id ? { ...row, status: nextStatus } : row)),
      );
      setUpdatingId(null);
    },
    [disableStatusChange, orgId],
  );

  const handleRemoveMember = useCallback(
    async (member: MemberRow) => {
      if (!orgId) return;
      if (disableStatusChange(member)) return;

      setUpdatingId(member.id);
      setActionError(null);

      const { error } = await supabase
        .from('organization_members')
        .update({
          status: 'removed',
          removed_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (error) {
        setActionError(error.message);
        setUpdatingId(null);
        return;
      }

      setMembers((prev) => prev.filter((row) => row.id !== member.id));
      setUpdatingId(null);
    },
    [disableStatusChange, orgId],
  );

  const handleUpdateVisibility = useCallback(
    async (nextVisibility: OrgVisibility) => {
      if (!orgId) return;

      setSavingVisibility(true);
      setVisibilityError(null);

      const { error } = await supabase
        .from('organizations')
        .update({ visibility: nextVisibility })
        .eq('id', orgId);

      if (error) {
        setVisibilityError(error.message);
        setSavingVisibility(false);
        return;
      }

      setOrgVisibility(nextVisibility);
      setSavingVisibility(false);
      void refreshOrganizations();
    },
    [orgId, refreshOrganizations],
  );

  const handleCreateInvite = useCallback(async () => {
    if (!orgId || !isAdmin) return;

    setCreatingInvite(true);
    setInviteError(null);
    setInviteMessage(null);

    const now = new Date();
    let expiresAt: string | null = null;
    if (inviteExpires !== '0') {
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + Number.parseInt(inviteExpires, 10));
      expiresAt = expiry.toISOString();
    }

    const maxUses = inviteQuota === '0' ? null : Number.parseInt(inviteQuota, 10);

    const { data, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: orgId,
        code: generateInviteCode(),
        note: inviteNote.trim() ? inviteNote.trim() : null,
        expires_at: expiresAt,
        max_uses: maxUses,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      setInviteError(error.message);
      setCreatingInvite(false);
      return;
    }

    setInviteNote('');
    setInviteMessage(t('dashboard.members.invite.feedback.created'));
    setCreatingInvite(false);
    void refreshInvites();

    return data?.id;
  }, [inviteExpires, inviteNote, inviteQuota, isAdmin, orgId, refreshInvites, t]);

  const handleRevokeInvite = useCallback(
    async (inviteId: string) => {
      if (!orgId || !isAdmin) return;

      const { error } = await supabase
        .from('organization_invites')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', inviteId);

      if (error) {
        setInviteError(error.message);
        return;
      }

      setInviteMessage(t('dashboard.members.invite.feedback.revoked'));
      void refreshInvites();
    },
    [isAdmin, orgId, refreshInvites, t],
  );

  const handleCopyInviteLink = useCallback((code: string) => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const url = `${origin}/invite/${code}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => setInviteMessage(t('dashboard.members.invite.feedback.copied')))
        .catch(() => setInviteError(t('dashboard.members.invite.feedback.copyFailed')));
    } else if (typeof window !== 'undefined') {
      window.prompt(t('dashboard.members.invite.copyPrompt'), url);
    }
  }, [t]);

  const handleReviewJoinRequest = useCallback(
    async (request: JoinRequestRow, nextStatus: 'approved' | 'rejected', note?: string | null) => {
      if (!isAdmin) return;

      setProcessingRequestIds((prev) => {
        const next = new Set(prev);
        next.add(request.id);
        return next;
      });
      setJoinRequestError(null);

      const { error } = await supabase.rpc('review_org_join_request', {
        p_request_id: request.id,
        p_next_status: nextStatus,
        p_response_note: note ?? null,
      });

      if (error) {
        setJoinRequestError(error.message);
        setProcessingRequestIds((prev) => {
          const next = new Set(prev);
          next.delete(request.id);
          return next;
        });
        return;
      }

      setJoinRequests((prev) =>
        prev.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: nextStatus,
                reviewedAt: new Date().toISOString(),
                responseNote: note ?? null,
              }
            : item,
        ),
      );

      setProcessingRequestIds((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });

      if (nextStatus === 'approved') {
        void refreshMembers();
      }
    },
    [isAdmin, refreshMembers],
  );

  return {
    organizationsLoading,
    orgId,
    isAdmin,
    members,
    membersLoading,
    membersError,
    actionError,
    updatingId,
    orgVisibility,
    visibilityLoading,
    savingVisibility,
    visibilityError,
    invites,
    invitesLoading,
    inviteError,
    inviteMessage,
    inviteNote,
    setInviteNote,
    inviteExpires,
    setInviteExpires,
    inviteQuota,
    setInviteQuota,
    creatingInvite,
    joinRequests,
    joinRequestsLoading,
    joinRequestError,
    processingRequestIds,
    disableRoleChange,
    disableStatusChange,
    handleRoleChange,
    handleStatusChange,
    handleRemoveMember,
    handleUpdateVisibility,
    handleCreateInvite,
    handleRevokeInvite,
    handleCopyInviteLink,
    refreshJoinRequests,
    handleReviewJoinRequest,
    refreshMembers,
  };
}
