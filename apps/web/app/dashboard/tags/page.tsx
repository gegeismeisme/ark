'use client';

import { useCallback, useMemo } from 'react';

import { useTranslations } from '@/lib/i18n/client';

import { MemberTagSection } from './member-tag-section';
import { TagCategorySection } from './tag-category-section';
import {
  SELECTION_TYPE_LABEL_KEYS,
  useTagManagement,
  type SelectionType,
  type TagRequest,
} from './use-tag-management';

const REQUEST_STATUS_LABEL_KEYS: Record<TagRequest['status'], string> = {
  pending: 'dashboard.tags.requests.status.pending',
  approved: 'dashboard.tags.requests.status.approved',
  rejected: 'dashboard.tags.requests.status.rejected',
  cancelled: 'dashboard.tags.requests.status.cancelled',
};

const REQUEST_STATUS_CLASS: Record<TagRequest['status'], string> = {
  pending: 'text-amber-600 dark:text-amber-300',
  approved: 'text-emerald-600 dark:text-emerald-300',
  rejected: 'text-red-600 dark:text-red-300',
  cancelled: 'text-zinc-500 dark:text-zinc-400',
};

const sectionCardClass =
  'space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900';

export default function TagsPage() {
  const t = useTranslations();

  const selectionTypeLabels = useMemo<Record<SelectionType, string>>(
    () => ({
      single: t(SELECTION_TYPE_LABEL_KEYS.single),
      multiple: t(SELECTION_TYPE_LABEL_KEYS.multiple),
    }),
    [t],
  );

  const requestStatusLabels = useMemo<Record<TagRequest['status'], string>>(
    () => ({
      pending: t(REQUEST_STATUS_LABEL_KEYS.pending),
      approved: t(REQUEST_STATUS_LABEL_KEYS.approved),
      rejected: t(REQUEST_STATUS_LABEL_KEYS.rejected),
      cancelled: t(REQUEST_STATUS_LABEL_KEYS.cancelled),
    }),
    [t],
  );
  const formatTimestamp = useCallback((value: string) => new Date(value).toLocaleString(), []);

  const {
    organizationsLoading,
    orgId,
    isOrgAdmin,
    canManageAnyCategory,
    categories,
    categoriesLoading,
    categoriesError,
    orgGroupsLoading,
    orgGroupsError,
    groupOptions,
    adminGroupIds,
    manageableCategoryIds,
    creatingCategory,
    newCategoryName,
    newCategorySelection,
    newCategoryRequired,
    newCategoryScope,
    newCategoryGroupId,
    newTagNames,
    categoryActionError,
    categoryUpdating,
    tagActionError,
    tagMutations,
    tagRequests,
    tagRequestsLoading,
    tagRequestsError,
    myTagRequests,
    myPendingRequestsByTagId,
    requestSubmitting,
    cancellationInProgress,
    resolvingRequests,
    selfMemberId,
    members,
    membersLoading,
    membersError,
    memberTags,
    memberTagNames,
    memberTagsLoading,
    memberTagsError,
    memberTagActionError,
    memberTagUpdating,
    handleCategoryNameChange,
    handleCategorySelectionChange,
    handleCategoryRequiredChange,
    handleCategoryScopeChange,
    handleCategoryGroupChange,
    handleTagNameChange,
    handleCreateCategory,
    handleUpdateCategory,
    handleCreateTag,
    handleToggleTagActive,
    handleRenameTag,
    handleDeleteTag,
    submitTagRequest,
    cancelTagRequest,
    resolveTagRequest,
    handleMemberSingleChange,
    handleMemberMultiToggle,
    handleClearMemberTags,
  } = useTagManagement();

  const selfAssignedTagIds = useMemo(() => {
    if (!selfMemberId) return new Set<string>();
    const assigned = new Set<string>();
    const memberEntry = memberTags[selfMemberId] ?? {};
    Object.values(memberEntry).forEach((tagIds) => {
      tagIds.forEach((tagId) => assigned.add(tagId));
    });
    return assigned;
  }, [memberTags, selfMemberId]);

  const canReviewRequests = isOrgAdmin || adminGroupIds.size > 0;

  const manageableRequests = useMemo(() => {
    if (!canReviewRequests) return [] as TagRequest[];
    return tagRequests.filter((request) => {
      if (isOrgAdmin) return true;
      return request.groupId ? adminGroupIds.has(request.groupId) : false;
    });
  }, [adminGroupIds, canReviewRequests, isOrgAdmin, tagRequests]);

  const pendingManageableRequests = useMemo(
    () => manageableRequests.filter((request) => request.status === 'pending'),
    [manageableRequests]
  );

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.tags.page.title')}
        </h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.tags.page.loading')}
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.tags.page.title')}
        </h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.tags.page.noOrg')}
        </div>
      </div>
    );
  }

  const errorBanners: Array<{ key: string; message: string | null }> = [
    { key: 'categories', message: categoriesError },
    { key: 'members', message: membersError },
    { key: 'memberTags', message: memberTagsError },
    { key: 'categoryAction', message: categoryActionError },
    { key: 'tagAction', message: tagActionError },
    { key: 'tagRequests', message: tagRequestsError },
    { key: 'memberTagAction', message: memberTagActionError },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.tags.page.title')}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('dashboard.tags.page.subtitle')}
        </p>
      </header>

      {errorBanners
        .filter((item) => Boolean(item.message))
        .map((item) => (
          <div
            key={item.key}
            className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
          >
            {item.message}
          </div>
        ))}

      <TagCategorySection
        isOrgAdmin={isOrgAdmin}
        canManageAnyCategory={canManageAnyCategory}
        categories={categories}
        categoriesLoading={categoriesLoading}
        orgGroupsLoading={orgGroupsLoading}
        orgGroupsError={orgGroupsError}
        groupOptions={groupOptions}
        manageableCategoryIds={manageableCategoryIds}
        creatingCategory={creatingCategory}
        newCategoryName={newCategoryName}
        newCategorySelection={newCategorySelection}
        newCategoryRequired={newCategoryRequired}
        newCategoryScope={newCategoryScope}
        newCategoryGroupId={newCategoryGroupId}
        newTagNames={newTagNames}
        categoryUpdating={categoryUpdating}
        tagMutations={tagMutations}
        selectionTypeLabels={selectionTypeLabels}
        selfMemberId={selfMemberId}
        selfAssignedTagIds={selfAssignedTagIds}
        myPendingRequestsByTagId={myPendingRequestsByTagId}
        requestSubmitting={requestSubmitting}
        cancellationInProgress={cancellationInProgress}
        tagRequestsLoading={tagRequestsLoading}
        onCategoryNameChange={handleCategoryNameChange}
        onCategorySelectionChange={handleCategorySelectionChange}
        onCategoryRequiredChange={handleCategoryRequiredChange}
        onCategoryScopeChange={handleCategoryScopeChange}
        onCategoryGroupChange={handleCategoryGroupChange}
        onTagNameChange={handleTagNameChange}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onCreateTag={handleCreateTag}
        onToggleTagActive={handleToggleTagActive}
        onRenameTag={handleRenameTag}
        onDeleteTag={handleDeleteTag}
        onSubmitTagRequest={submitTagRequest}
        onCancelTagRequest={cancelTagRequest}
      />

      {selfMemberId ? (
        <section className={sectionCardClass}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t('dashboard.tags.mine.title')}
            </h2>
            {myTagRequests.length > 0 ? (
              <span className="rounded-full bg-zinc-900/5 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-100/10 dark:text-zinc-300">
                {t('dashboard.tags.mine.count', { count: myTagRequests.length })}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('dashboard.tags.mine.intro')}</p>

          {tagRequestsLoading ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
              {t('dashboard.tags.mine.loading')}
            </div>
          ) : myTagRequests.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              {t('dashboard.tags.mine.empty')}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              {myTagRequests.map((request) => {
                const statusClass = REQUEST_STATUS_CLASS[request.status] ?? '';
                const cancelling = cancellationInProgress.has(request.id);
                const submittedAt = formatTimestamp(request.createdAt);
                const resolvedAt = request.resolvedAt ? formatTimestamp(request.resolvedAt) : null;
                return (
                  <li key={request.id} className="space-y-2 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{request.tagName}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {request.categoryName}
                          {request.groupName ? ` · ${request.groupName}` : ''}
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${statusClass}`}>
                        {requestStatusLabels[request.status]}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t('dashboard.tags.requests.submittedAt', { date: submittedAt })}
                      {resolvedAt
                        ? ` · ${t('dashboard.tags.requests.resolvedAt', { date: resolvedAt })}`
                        : ''}
                    </div>
                    {request.reason ? (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t('dashboard.tags.mine.reason', { reason: request.reason })}
                      </div>
                    ) : null}
                    {request.adminNote ? (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t('dashboard.tags.mine.adminNote', { note: request.adminNote })}
                      </div>
                    ) : null}
                    {request.status === 'pending' ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-zinc-500 underline transition hover:text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-200 dark:disabled:text-zinc-500/60"
                        onClick={() => void cancelTagRequest(request.id)}
                        disabled={cancelling}
                      >
                        {cancelling ? t('dashboard.tags.mine.cancelling') : t('dashboard.tags.mine.cancel')}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {canReviewRequests ? (
        <section className={sectionCardClass}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t('dashboard.tags.review.title')}
            </h2>
            {pendingManageableRequests.length > 0 ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-200">
                {t('dashboard.tags.review.count', { count: pendingManageableRequests.length })}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t('dashboard.tags.review.intro')}
          </p>

          {tagRequestsLoading ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
              {t('dashboard.tags.review.loading')}
            </div>
          ) : manageableRequests.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              {t('dashboard.tags.review.empty')}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              {manageableRequests.map((request) => {
                const statusClass = REQUEST_STATUS_CLASS[request.status] ?? '';
                const resolving = resolvingRequests.has(request.id);
                return (
                  <li key={request.id} className="space-y-2 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{request.tagName}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {t('dashboard.tags.review.request', {
                            member: request.memberName ?? request.memberUserId.slice(0, 8),
                            category: request.categoryName,
                          })}
                          {request.groupName ? ` · ${request.groupName}` : ''}
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${statusClass}`}>
                      {requestStatusLabels[request.status]}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t('dashboard.tags.requests.submittedAt', { date: formatTimestamp(request.createdAt) })}
                      {request.resolvedAt
                        ? ` · ${t('dashboard.tags.requests.resolvedAt', { date: formatTimestamp(request.resolvedAt) })}`
                        : ''}
                    </div>
                    {request.reason ? (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t('dashboard.tags.review.reason', { reason: request.reason })}
                      </div>
                    ) : null}
                    {request.adminNote ? (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t('dashboard.tags.review.adminNote', { note: request.adminNote })}
                      </div>
                    ) : null}
                    {request.status === 'pending' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-emerald-400 dark:border-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/20"
                          onClick={() => {
                            const note =
                              typeof window !== 'undefined'
                                ? window.prompt(t('dashboard.tags.review.prompt.approve'), '')
                                : undefined;
                            void resolveTagRequest(request.id, 'approved', note ?? undefined);
                          }}
                          disabled={resolving}
                        >
                          {resolving ? t('dashboard.tags.review.processing') : t('dashboard.tags.review.action.approve')}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-amber-400 dark:border-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/20"
                          onClick={() => {
                            const note =
                              typeof window !== 'undefined'
                                ? window.prompt(t('dashboard.tags.review.prompt.reject'), '')
                                : undefined;
                            void resolveTagRequest(request.id, 'rejected', note ?? undefined);
                          }}
                          disabled={resolving}
                        >
                          {resolving ? t('dashboard.tags.review.processing') : t('dashboard.tags.review.action.reject')}
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <MemberTagSection
        isOrgAdmin={isOrgAdmin}
        manageableCategoryIds={manageableCategoryIds}
        categories={categories}
        members={members}
        membersLoading={membersLoading}
        memberTags={memberTags}
        memberTagNames={memberTagNames}
        memberTagsLoading={memberTagsLoading}
        memberTagUpdating={memberTagUpdating}
        selectionTypeLabels={selectionTypeLabels}
        onMemberSingleChange={handleMemberSingleChange}
        onMemberMultiToggle={handleMemberMultiToggle}
        onClearMemberTags={handleClearMemberTags}
      />
    </div>
  );
}


