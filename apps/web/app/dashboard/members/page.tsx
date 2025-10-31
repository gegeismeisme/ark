'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { supabase } from '../../../lib/supabaseClient';
import { useOrgContext } from '../org-provider';
import {
  InviteManager,
  JoinRequestsPanel,
  MembersTable,
  VisibilityCard,
} from './components';
import type {
  InviteRow,
  JoinRequestRow,
  MemberRow,
  MemberStatus,
  OrgRole,
  OrgVisibility,
} from './types';

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function generateInviteCode(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

export default function MembersPage() {
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

      const updates: Record<string, unknown> = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      if (nextStatus === 'active') {
        updates.removed_at = null;
        updates.joined_at = member.joinedAt ?? new Date().toISOString();
      } else if (nextStatus === 'suspended') {
        updates.removed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('organization_members')
        .update(updates)
        .eq('id', member.id);

      if (error) {
        setActionError(error.message);
        setUpdatingId(null);
        return;
      }

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id
            ? {
                ...row,
                status: nextStatus,
                joinedAt:
                  nextStatus === 'active'
                    ? member.joinedAt ?? new Date().toISOString()
                    : row.joinedAt,
              }
            : row,
        ),
      );
      setUpdatingId(null);
    },
    [disableStatusChange, orgId],
  );

  const handleRemoveMember = useCallback(
    async (member: MemberRow) => {
      if (!orgId || disableStatusChange(member)) return;

      setUpdatingId(member.id);
      setActionError(null);

      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('organization_members')
        .update({
          status: 'suspended',
          removed_at: timestamp,
          updated_at: timestamp,
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
    async (next: OrgVisibility) => {
      if (!orgId || next === orgVisibility) return;

      setSavingVisibility(true);
      setVisibilityError(null);

      const { error } = await supabase
        .from('organizations')
        .update({ visibility: next })
        .eq('id', orgId);

      if (error) {
        setVisibilityError(error.message);
        setSavingVisibility(false);
        return;
      }

      setOrgVisibility(next);
      setSavingVisibility(false);
      void refreshOrganizations();
    },
    [orgId, orgVisibility, refreshOrganizations],
  );

  const handleCreateInvite = useCallback(async () => {
    if (!orgId || !isAdmin) return;

    setCreatingInvite(true);
    setInviteError(null);
    setInviteMessage(null);

    const code = generateInviteCode();
    const note = inviteNote.trim() || null;
    const expiresAt =
      inviteExpires === '0'
        ? null
        : new Date(
            Date.now() + (inviteExpires === '7' ? 7 : 30) * 24 * 60 * 60 * 1000,
          ).toISOString();
    const maxUses = inviteQuota === '0' ? null : Number(inviteQuota);

    const { data, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: orgId,
        code,
        note,
        created_by: user?.id ?? null,
        expires_at: expiresAt,
        max_uses: maxUses,
      })
      .select('id, code, note, created_at, expires_at, max_uses, use_count, revoked_at')
      .single();

    if (error) {
      setInviteError(error.message);
      setCreatingInvite(false);
      return;
    }

    setInvites((prev) => [
      {
        id: data.id as string,
        code: data.code as string,
        note: (data as { note: string | null }).note,
        createdAt: (data as { created_at: string }).created_at,
        expiresAt: (data as { expires_at: string | null }).expires_at,
        maxUses: (data as { max_uses: number | null }).max_uses,
        useCount: (data as { use_count: number }).use_count,
        revokedAt: (data as { revoked_at: string | null }).revoked_at,
      },
      ...prev,
    ]);
    setInviteNote('');
    setInviteMessage('邀请链接已生成，可复制后发送给成员。');
    setCreatingInvite(false);
  }, [inviteExpires, inviteNote, inviteQuota, isAdmin, orgId, user?.id]);

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

      setInvites((prev) =>
        prev.map((invite) =>
          invite.id === inviteId ? { ...invite, revokedAt: new Date().toISOString() } : invite,
        ),
      );
    },
    [isAdmin, orgId],
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
        .then(() => setInviteMessage('邀请链接已复制到剪贴板。'))
        .catch(() => setInviteError('复制失败，请手动复制链接。'));
    } else if (typeof window !== 'undefined') {
      window.prompt('请复制邀请链接', url);
    }
  }, []);

  const handleReviewJoinRequest = useCallback(
    async (request: JoinRequestRow, nextStatus: 'approved' | 'rejected', note?: string | null) => {
      if (!isAdmin) return;

      setProcessingRequestIds((prev) => {
        const next = new Set(prev);
        next.add(request.id);
        return next;
      });

      const { error } = await supabase.rpc('review_org_join_request', {
        p_request_id: request.id,
        p_next_status: nextStatus,
        p_response_note: note ?? null,
      });

      setProcessingRequestIds((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });

      if (error) {
        setJoinRequestError(error.message);
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

      if (nextStatus === 'approved') {
        void refreshMembers();
      }
    },
    [isAdmin, refreshMembers],
  );

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">组织成员</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织信息...
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">组织成员</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          暂未选择组织，请先在导航栏创建或选择一个组织。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">组织成员</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              管理组织可见性、邀请链接和加入申请，保持成员信息及时更新。
              {isAdmin ? (
                <>
                  {' '}
                  希望成员主动申请？前往
                  <Link className="mx-1 text-zinc-900 underline dark:text-zinc-100" href="/organizations">
                    组织目录
                  </Link>
                  查看公开展示效果。
                </>
              ) : null}
            </p>
        </div>
      </div>

      {isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-6">
            <VisibilityCard
              visibility={orgVisibility}
              loading={visibilityLoading}
              saving={savingVisibility}
              error={visibilityError}
              onChange={handleUpdateVisibility}
            />
            <InviteManager
              invites={invites}
              loading={invitesLoading}
              error={inviteError}
              message={inviteMessage}
              note={inviteNote}
              expires={inviteExpires}
              quota={inviteQuota}
              creating={creatingInvite}
              formatDateTime={formatDateTime}
              onNoteChange={setInviteNote}
              onExpiresChange={setInviteExpires}
              onQuotaChange={setInviteQuota}
              onCreateInvite={handleCreateInvite}
              onRevokeInvite={handleRevokeInvite}
              onCopyLink={handleCopyInviteLink}
            />
            <JoinRequestsPanel
              requests={joinRequests}
              loading={joinRequestsLoading}
              error={joinRequestError}
              processingIds={processingRequestIds}
              formatDateTime={formatDateTime}
              onReview={handleReviewJoinRequest}
              onRefresh={refreshJoinRequests}
            />
          </div>
          <MembersTable
            members={members}
            membersLoading={membersLoading}
            membersError={membersError}
            actionError={actionError}
            updatingId={updatingId}
            isAdmin
            formatDateTime={formatDateTime}
            disableRoleChange={disableRoleChange}
            disableStatusChange={disableStatusChange}
            onRoleChange={handleRoleChange}
            onStatusChange={handleStatusChange}
            onRemoveMember={handleRemoveMember}
          />
        </div>
      ) : (
        <MembersTable
          members={members}
          membersLoading={membersLoading}
          membersError={membersError}
          actionError={null}
          updatingId={null}
          isAdmin={false}
          formatDateTime={formatDateTime}
          disableRoleChange={() => true}
          disableStatusChange={() => true}
          onRoleChange={() => undefined}
          onStatusChange={() => undefined}
          onRemoveMember={() => undefined}
        />
      )}
    </div>
  );
}
