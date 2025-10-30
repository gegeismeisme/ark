'use client';

import { MemberTagSection } from './member-tag-section';
import { TagCategorySection } from './tag-category-section';
import { selectionTypeLabels, useTagManagement } from './use-tag-management';

export default function TagsPage() {
  const {
    organizationsLoading,
    orgId,
    isAdmin,
    categories,
    categoriesLoading,
    categoriesError,
    creatingCategory,
    newCategoryName,
    newCategorySelection,
    newCategoryRequired,
    newTagNames,
    categoryActionError,
    categoryUpdating,
    tagActionError,
    tagMutations,
    handleCategoryNameChange,
    handleCategorySelectionChange,
    handleCategoryRequiredChange,
    handleTagNameChange,
    handleCreateCategory,
    handleUpdateCategory,
    handleCreateTag,
    handleToggleTagActive,
    members,
    membersLoading,
    membersError,
    memberTags,
    memberTagNames,
    memberTagsLoading,
    memberTagsError,
    memberTagActionError,
    memberTagUpdating,
    handleMemberSingleChange,
    handleMemberMultiToggle,
    handleClearMemberTags,
  } = useTagManagement();

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">标签管理</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织信息...
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">标签管理</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          尚未选择组织，请先在导航栏中选择一个组织后再查看标签。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">标签管理</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          查看并管理组织的标签类别、标签项以及成员标签分布。管理员可直接在此配置标签，后续发布任务时即可按标签快速筛选成员。
        </p>
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
      {memberTagActionError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {memberTagActionError}
        </div>
      ) : null}

      <TagCategorySection
        isAdmin={isAdmin}
        categories={categories}
        categoriesLoading={categoriesLoading}
        creatingCategory={creatingCategory}
        newCategoryName={newCategoryName}
        newCategorySelection={newCategorySelection}
        newCategoryRequired={newCategoryRequired}
        newTagNames={newTagNames}
        categoryUpdating={categoryUpdating}
        tagMutations={tagMutations}
        selectionTypeLabels={selectionTypeLabels}
        onCategoryNameChange={handleCategoryNameChange}
        onCategorySelectionChange={handleCategorySelectionChange}
        onCategoryRequiredChange={handleCategoryRequiredChange}
        onTagNameChange={handleTagNameChange}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onCreateTag={handleCreateTag}
        onToggleTagActive={handleToggleTagActive}
      />

      <MemberTagSection
        isAdmin={isAdmin}
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
