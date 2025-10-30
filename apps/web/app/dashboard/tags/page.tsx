'use client';

import { useMemo } from 'react';

import { MemberTagSection } from './member-tag-section';
import { TagCategorySection } from './tag-category-section';
import { selectionTypeLabels, useTagManagement, type TagRequest } from './use-tag-management';

export default function TagsPage() {
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
    submitTagRequest,
    cancelTagRequest,
    resolveTagRequest,
    resolvingRequests,
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

  const requestStatusLabel: Record<string, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    cancelled: '已撤回',
  };

  const requestStatusClass: Record<string, string> = {
    pending: 'text-amber-600 dark:text-amber-300',
    approved: 'text-emerald-600 dark:text-emerald-300',
    rejected: 'text-red-600 dark:text-red-300',
    cancelled: 'text-zinc-500 dark:text-zinc-400',
  };

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
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">鏍囩绠＄悊</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          姝ｅ湪鍔犺浇缁勭粐淇℃伅...
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">鏍囩绠＄悊</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          灏氭湭閫夋嫨缁勭粐锛岃鍏堝湪瀵艰埅鏍忎腑閫夋嫨涓€涓粍缁囧悗鍐嶆煡鐪嬫爣绛俱€?        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">鏍囩绠＄悊</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          鏌ョ湅骞剁鐞嗙粍缁囩殑鏍囩绫诲埆銆佹爣绛鹃」浠ュ強鎴愬憳鏍囩鍒嗗竷銆傜鐞嗗憳鍙洿鎺ュ湪姝ら厤缃爣绛撅紝鍚庣画鍙戝竷浠诲姟鏃跺嵆鍙寜鏍囩蹇€熺瓫閫夋垚鍛樸€?        </p>
      </div>

      {categoriesError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {categoriesError}
        </div>
      ) : null}
      {membersError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {membersError}
        </div>
      ) : null}
      {memberTagsError ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {memberTagsError}
        </div>
      ) : null}
      {categoryActionError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {categoryActionError}
        </div>
      ) : null}
      {tagActionError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {tagActionError}
        </div>
      ) : null}
      {tagRequestsError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {tagRequestsError}
        </div>
      ) : null}
      {memberTagActionError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {memberTagActionError}
        </div>
      ) : null}

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
        selfMemberId={selfMemberId}
        selfAssignedTagIds={selfAssignedTagIds}
        myPendingRequestsByTagId={myPendingRequestsByTagId}
        requestSubmitting={requestSubmitting}
        cancellationInProgress={cancellationInProgress}
        tagRequestsLoading={tagRequestsLoading}
        selectionTypeLabels={selectionTypeLabels}
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
        onSubmitTagRequest={submitTagRequest}
        onCancelTagRequest={cancelTagRequest}
      />

      {selfMemberId ? (
        <section className='space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900'>
          <div>
            <h2 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>我的标签申请</h2>
            <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-400'>
              查看已提交的标签申请，待审批前可以随时撤回。
            </p>
          </div>
          {tagRequestsLoading ? (
            <div className='rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400'>
              正在加载申请记录...
            </div>
          ) : myTagRequests.length === 0 ? (
            <div className='rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'>
              暂无申请记录。
            </div>
          ) : (
            <ul className='divide-y divide-zinc-200 text-sm dark:divide-zinc-800'>
              {myTagRequests.map((request) => {
                const statusClass = requestStatusClass[request.status] ?? 'text-zinc-500 dark:text-zinc-400';
                const cancelBusy = cancellationInProgress.has(request.id);
                return (
                  <li key={request.id} className='space-y-1 py-2'>
                    <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                      <div>
                        <div className='font-medium text-zinc-900 dark:text-zinc-100'>{request.tagName}</div>
                        <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                          {request.categoryName}
                          {request.groupName ? ` · ${request.groupName}` : ''}
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${statusClass}`}>
                        {requestStatusLabel[request.status] ?? request.status}
                      </span>
                    </div>
                    <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                      提交时间：{new Date(request.createdAt).toLocaleString()}
                      {request.resolvedAt ? ` · 处理时间：${new Date(request.resolvedAt).toLocaleString()}` : ''}
                    </div>
                    {request.reason ? (
                      <div className='text-xs text-zinc-500 dark:text-zinc-400'>申请理由：{request.reason}</div>
                    ) : null}
                    {request.adminNote ? (
                      <div className='text-xs text-zinc-500 dark:text-zinc-400'>审批备注：{request.adminNote}</div>
                    ) : null}
                    {request.status === 'pending' ? (
                      <div>
                        <button
                          type='button'
                          className='text-xs font-medium text-zinc-500 underline transition hover:text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-200 dark:disabled:text-zinc-500/60'
                          onClick={() => void cancelTagRequest(request.id)}
                          disabled={cancelBusy || tagRequestsLoading}
                        >
                          {cancelBusy ? '撤回中…' : '撤回申请'}
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

      {canReviewRequests ? (
        <section className='space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>标签申请审批</h2>
            {pendingManageableRequests.length ? (
              <span className='rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-200'>
                待审批 {pendingManageableRequests.length}
              </span>
            ) : null}
            <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-400'>
              审核组织或所属小组成员提交的标签申请，审批通过后标签会自动生效。
            </p>
          </div>
          {tagRequestsLoading ? (
            <div className='rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400'>
              正在加载申请记录...
            </div>
          ) : manageableRequests.length === 0 ? (
            <div className='rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'>
              暂无可审批的标签申请。
            </div>
          ) : (
            <ul className='divide-y divide-zinc-200 text-sm dark:divide-zinc-800'>
              {manageableRequests.map((request) => {
                const statusClass = requestStatusClass[request.status] ?? 'text-zinc-500 dark:text-zinc-400';
                const resolving = resolvingRequests.has(request.id);
                return (
                  <li key={request.id} className='space-y-2 py-3'>
                    <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                      <div>
                        <div className='font-medium text-zinc-900 dark:text-zinc-100'>{request.tagName}</div>
                        <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                          申请人：{request.memberName ?? request.memberUserId.slice(0, 8)} · {request.categoryName}
                          {request.groupName ? ` · ${request.groupName}` : ''}
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${statusClass}`}>
                        {requestStatusLabel[request.status] ?? request.status}
                      </span>
                    </div>
                    <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                      提交时间：{new Date(request.createdAt).toLocaleString()}
                      {request.resolvedAt ? ` · 处理时间：${new Date(request.resolvedAt).toLocaleString()}` : ''}
                    </div>
                    {request.reason ? (
                      <div className='text-xs text-zinc-500 dark:text-zinc-400'>申请理由：{request.reason}</div>
                    ) : null}
                    {request.adminNote ? (
                      <div className='text-xs text-zinc-500 dark:text-zinc-400'>审批备注：{request.adminNote}</div>
                    ) : null}
                    {request.status === 'pending' ? (
                      <div className='flex flex-wrap items-center gap-2'>
                        <button
                          type='button'
                          className='rounded-md border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-emerald-400 dark:border-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/20'
                          onClick={() => {
                            const note = window.prompt('审批备注（可选）', '');
                            void resolveTagRequest(request.id, 'approved', note ?? undefined);
                          }}
                          disabled={resolving}
                        >
                          {resolving ? '处理中…' : '通过'}
                        </button>
                        <button
                          type='button'
                          className='rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-amber-400 dark:border-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/20'
                          onClick={() => {
                            const note = window.prompt('驳回原因（可选）', '');
                            void resolveTagRequest(request.id, 'rejected', note ?? undefined);
                          }}
                          disabled={resolving}
                        >
                          {resolving ? '处理中…' : '驳回'}
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
