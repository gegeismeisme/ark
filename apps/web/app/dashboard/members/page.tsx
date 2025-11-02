'use client';

import Link from 'next/link';

import {
  InviteManager,
  JoinRequestsPanel,
  MembersTable,
  VisibilityCard,
} from './components';
import { useMembersDashboard } from './hooks/use-members-dashboard';

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value ?? '—';
  }
}

export default function MembersPage() {
  const {
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
  } = useMembersDashboard();

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">组织成员</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织信息...
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">组织成员</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          尚未选择组织，请先在顶部导航中选择或创建一个组织后再进行成员管理。
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
            管理组织的公开范围、邀请链接与加入申请，让成员信息和权限保持最新。
            {isAdmin ? (
              <>
                {' '}可前往
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
