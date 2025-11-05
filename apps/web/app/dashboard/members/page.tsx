'use client';

import Link from 'next/link';

import { useTranslations } from '@/lib/i18n/client';

import {
  InviteManager,
  JoinRequestsPanel,
  MembersTable,
  VisibilityCard,
} from './components';
import { useMembersDashboard } from './hooks/use-members-dashboard';

function formatDateTime(value: string | null, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (!value) return t('common.notSet');
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value ?? t('common.notSet');
  }
}

export default function MembersPage() {
  const t = useTranslations();
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

  const formatDate = (value: string | null) => formatDateTime(value, t);

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.members.title')}
        </h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.members.loadingOrg')}
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.members.title')}
        </h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.members.noOrg')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {t('dashboard.members.title')}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t('dashboard.members.subtitle')}
            {isAdmin ? (
              <>
                {' '}
                {t('dashboard.members.subtitle.linkPrompt')}
                <Link className="mx-1 text-zinc-900 underline dark:text-zinc-100" href="/organizations">
                  {t('dashboard.members.subtitle.linkLabel')}
                </Link>
                {t('dashboard.members.subtitle.linkSuffix')}
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
              formatDateTime={formatDate}
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
              formatDateTime={formatDate}
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
            formatDateTime={formatDate}
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
          formatDateTime={formatDate}
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
