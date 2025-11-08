'use client';

import { useState, type FormEvent } from 'react';

import {
  PaginationControls,
  usePagination,
} from '../components/pagination';
import type {
  GroupSummary,
  SelectionType,
  TagCategory,
  TagRequest,
} from './use-tag-management';
import { useTranslations } from '@/lib/i18n/client';
import { ConfirmDialog, PromptDialog } from './components/dialogs';

type TagCategorySectionProps = {
  isOrgAdmin: boolean;
  canManageAnyCategory: boolean;
  categories: TagCategory[];
  categoriesLoading: boolean;
  orgGroupsLoading: boolean;
  orgGroupsError: string | null;
  groupOptions: GroupSummary[];
  manageableCategoryIds: Set<string>;
  creatingCategory: boolean;
  newCategoryName: string;
  newCategorySelection: SelectionType;
  newCategoryRequired: boolean;
  newCategoryScope: 'organization' | 'group';
  newCategoryGroupId: string | null;
  newTagNames: Record<string, string>;
  categoryUpdating: Record<string, boolean>;
  tagMutations: Record<string, boolean>;
  selectionTypeLabels: Record<SelectionType, string>;
  selfMemberId: string | null;
  selfAssignedTagIds: Set<string>;
  myPendingRequestsByTagId: Record<string, TagRequest>;
  requestSubmitting: Set<string>;
  cancellationInProgress: Set<string>;
  tagRequestsLoading: boolean;
  onCategoryNameChange: (value: string) => void;
  onCategorySelectionChange: (value: SelectionType) => void;
  onCategoryRequiredChange: (value: boolean) => void;
  onCategoryScopeChange: (value: 'organization' | 'group') => void;
  onCategoryGroupChange: (value: string | null) => void;
  onTagNameChange: (categoryId: string, value: string) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateCategory: (
    categoryId: string,
    updates: Partial<{
      is_required: boolean;
      selection_type: SelectionType;
    }>,
  ) => void;
  onCreateTag: (event: FormEvent<HTMLFormElement>, categoryId: string) => void;
  onToggleTagActive: (tagId: string, shouldActivate: boolean) => void;
  onRenameTag: (tagId: string, name: string) => void;
  onDeleteTag: (tagId: string) => void;
  onSubmitTagRequest: (tagId: string) => void;
  onCancelTagRequest: (requestId: string) => void;
};

const sectionCardClass =
  'space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900';

export function TagCategorySection({
  isOrgAdmin,
  canManageAnyCategory,
  categories,
  categoriesLoading,
  orgGroupsLoading,
  orgGroupsError,
  groupOptions,
  manageableCategoryIds,
  creatingCategory,
  newCategoryName,
  newCategorySelection,
  newCategoryRequired,
  newCategoryScope,
  newCategoryGroupId,
  newTagNames,
  categoryUpdating,
  tagMutations,
  selectionTypeLabels,
  selfMemberId,
  selfAssignedTagIds,
  myPendingRequestsByTagId,
  requestSubmitting,
  cancellationInProgress,
  tagRequestsLoading,
  onCategoryNameChange,
  onCategorySelectionChange,
  onCategoryRequiredChange,
  onCategoryScopeChange,
  onCategoryGroupChange,
  onTagNameChange,
  onCreateCategory,
  onUpdateCategory,
  onCreateTag,
  onToggleTagActive,
  onRenameTag,
  onDeleteTag,
  onSubmitTagRequest,
  onCancelTagRequest,
}: TagCategorySectionProps) {
  const t = useTranslations();
  const pagination = usePagination(categories, { pageSize: 5 });
  const [renameDialog, setRenameDialog] = useState<{ tagId: string; currentName: string } | null>(
    null,
  );
  const [deleteDialog, setDeleteDialog] = useState<{ tagId: string; tagName: string } | null>(null);

  const handleRenameConfirm = (nextName: string) => {
    if (!renameDialog) return;
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === renameDialog.currentName) {
      setRenameDialog(null);
      return;
    }
    onRenameTag(renameDialog.tagId, trimmed);
    setRenameDialog(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteDialog) return;
    onDeleteTag(deleteDialog.tagId);
    setDeleteDialog(null);
  };

  const renameSubmitting = renameDialog ? Boolean(tagMutations[renameDialog.tagId]) : false;
  const deleteSubmitting = deleteDialog ? Boolean(tagMutations[deleteDialog.tagId]) : false;

  return (
    <>
      <section className="space-y-4">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.tags.categories.title')}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('dashboard.tags.categories.subtitle')}
        </p>
      </header>

      {canManageAnyCategory ? (
        <form onSubmit={onCreateCategory} className={sectionCardClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {t('dashboard.tags.categories.nameLabel')}
                <input
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                  placeholder={t('dashboard.tags.categories.namePlaceholder')}
                  value={newCategoryName}
                  onChange={(event) => onCategoryNameChange(event.target.value)}
                  disabled={creatingCategory}
                />
              </label>
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-300">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="category-selection"
                    value="single"
                    checked={newCategorySelection === 'single'}
                    onChange={() => onCategorySelectionChange('single')}
                    disabled={creatingCategory}
                    className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  {t('dashboard.tags.selection.single')}
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="category-selection"
                    value="multiple"
                    checked={newCategorySelection === 'multiple'}
                    onChange={() => onCategorySelectionChange('multiple')}
                    disabled={creatingCategory}
                    className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  {t('dashboard.tags.selection.multiple')}
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={newCategoryRequired}
                    onChange={(event) => onCategoryRequiredChange(event.target.checked)}
                    disabled={creatingCategory}
                    className="h-3.5 w-3.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  {t('dashboard.tags.categories.required')}
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="category-scope"
                    value="organization"
                    checked={newCategoryScope === 'organization'}
                    onChange={() => onCategoryScopeChange('organization')}
                    className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                    disabled={creatingCategory || !isOrgAdmin}
                  />
                  {t('dashboard.tags.categories.scope.organization')}
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="category-scope"
                    value="group"
                    checked={newCategoryScope === 'group'}
                    onChange={() => onCategoryScopeChange('group')}
                    className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                    disabled={creatingCategory}
                  />
                  {t('dashboard.tags.categories.scope.group')}
                </label>
              </div>
              {newCategoryScope === 'group' ? (
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {t('dashboard.tags.categories.scopeLabel')}
                  <select
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                    value={newCategoryGroupId ?? ''}
                    onChange={(event) =>
                      onCategoryGroupChange(event.target.value ? event.target.value : null)
                    }
                    disabled={creatingCategory || orgGroupsLoading}
                  >
                    <option value="">{t('dashboard.tags.categories.groupPlaceholder')}</option>
                    {groupOptions.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {orgGroupsError ? (
                <p className="text-xs text-red-600 dark:text-red-300">
                  {t('dashboard.tags.categories.groupLoadFailed', { error: orgGroupsError })}
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
              disabled={creatingCategory || !newCategoryName.trim()}
            >
              {creatingCategory
                ? t('dashboard.tags.categories.submitting')
                : t('dashboard.tags.categories.submit')}
            </button>
          </div>
        </form>
      ) : null}

      {categoriesLoading ? (
        <div className={sectionCardClass}>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            {t('dashboard.tags.categories.loading')}
          </div>
        </div>
      ) : pagination.totalItems === 0 ? (
        <div className={sectionCardClass}>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            {canManageAnyCategory
              ? t('dashboard.tags.categories.list.empty')
              : t('dashboard.tags.categories.error.noPermissions')}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pagination.paginatedItems.map((category) => {
            const manageable = manageableCategoryIds.has(category.id);
            const updating = Boolean(categoryUpdating[category.id]);
            const newTagKey = `create-${category.id}`;
            const creatingTag = Boolean(tagMutations[newTagKey]);

            return (
              <article key={category.id} className={sectionCardClass}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{category.name}</h3>
                      {category.isRequired ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200">
                          {t('dashboard.tags.categories.required')}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {category.groupName
                          ? t('dashboard.tags.categories.badge.group', { group: category.groupName })
                          : t('dashboard.tags.categories.scope.organization')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t('dashboard.tags.categories.modeLabel', {
                        mode: selectionTypeLabels[category.selectionType],
                      })}
                    </p>
                  </div>
                  {manageable ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-zinc-600 transition hover:border-emerald-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                        onClick={() =>
                          onUpdateCategory(category.id, { is_required: !category.isRequired })
                        }
                        disabled={updating}
                      >
                        {updating
                          ? t('dashboard.tags.categories.actions.updating')
                          : category.isRequired
                          ? t('dashboard.tags.categories.actions.setOptional')
                          : t('dashboard.tags.categories.actions.setRequired')}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-zinc-600 transition hover:border-emerald-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                        onClick={() =>
                          onUpdateCategory(category.id, {
                            selection_type: category.selectionType === 'single' ? 'multiple' : 'single',
                          })
                        }
                        disabled={updating}
                      >
                        {updating
                          ? t('dashboard.tags.categories.actions.updating')
                          : category.selectionType === 'single'
                          ? t('dashboard.tags.categories.actions.switchToMultiple')
                          : t('dashboard.tags.categories.actions.switchToSingle')}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <ul className="space-y-2">
                    {category.tags.map((tag) => {
                      const tagKey = `tag-${tag.id}`;
                      const toggling = Boolean(tagMutations[tagKey]);
                      const assignedSelf = selfAssignedTagIds.has(tag.id);
                      const pendingRequest = myPendingRequestsByTagId[tag.id];
                      const submittingRequest = requestSubmitting.has(tag.id);
                      const cancelling = pendingRequest
                        ? cancellationInProgress.has(pendingRequest.id)
                        : false;

                      return (
                        <li
                          key={tag.id}
                          className="flex flex-col gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-medium ${
                                tag.isActive
                                  ? 'text-zinc-800 dark:text-zinc-100'
                                  : 'text-zinc-400 dark:text-zinc-500'
                              }`}
                            >
                              {tag.name}
                            </span>
                            {assignedSelf ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200">
                                {t('dashboard.tags.categories.badge.selfOwned')}
                              </span>
                            ) : null}
                            {!tag.isActive ? (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-200">
                                {t('dashboard.tags.categories.badge.inactive')}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                            {manageable ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:border-emerald-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                                  onClick={() => onToggleTagActive(tag.id, !tag.isActive)}
                                  disabled={toggling}
                                >
                                  {toggling
                                    ? t('dashboard.tags.categories.actions.updating')
                                    : tag.isActive
                                    ? t('dashboard.tags.categories.actions.disableTag')
                                    : t('dashboard.tags.categories.actions.enableTag')}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
                                  onClick={() => setRenameDialog({ tagId: tag.id, currentName: tag.name })}
                                  disabled={toggling}
                                >
                                  {t('dashboard.tags.categories.actions.renameTag')}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                                  onClick={() => setDeleteDialog({ tagId: tag.id, tagName: tag.name })}
                                  disabled={toggling}
                                >
                                  {t('dashboard.tags.categories.actions.deleteTag')}
                                </button>
                              </div>
                            ) : selfMemberId && tag.isActive ? (
                              <div className="flex items-center gap-2">
                                {pendingRequest ? (
                                  <>
                                    <span className="text-amber-600 dark:text-amber-300">{t('dashboard.tags.categories.requests.pending')}</span>
                                    <button
                                      type="button"
                                      className="rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-amber-300 dark:border-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/20"
                                      onClick={() => onCancelTagRequest(pendingRequest.id)}
                                      disabled={cancelling}
                                    >
                                      {cancelling ? t('dashboard.tags.mine.cancelling') : t('dashboard.tags.categories.requests.cancel')}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-emerald-300 dark:border-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/20"
                                    onClick={() => onSubmitTagRequest(tag.id)}
                                    disabled={submittingRequest || tagRequestsLoading}
                                  >
                                    {submittingRequest ? t('dashboard.tags.categories.requests.submitting') : t('dashboard.tags.categories.requests.submit')}
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {manageable ? (
                    <form
                      onSubmit={(event) => onCreateTag(event, category.id)}
                      className="flex flex-col gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
                    >
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {t('dashboard.tags.categories.tagForm.title')}
                        <input
                          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                          placeholder={t('dashboard.tags.categories.tagForm.placeholder')}
                          value={newTagNames[category.id] ?? ''}
                          onChange={(event) => onTagNameChange(category.id, event.target.value)}
                          disabled={creatingTag}
                        />
                      </label>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <button
                          type="submit"
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
                          disabled={creatingTag || !(newTagNames[category.id] ?? '').trim()}
                        >
                          {creatingTag
                            ? t('dashboard.tags.categories.tagForm.submitting')
                            : t('dashboard.tags.categories.tagForm.submit')}
                        </button>
                        <span>{t('dashboard.tags.categories.tagForm.hint')}</span>
                      </div>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}

          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <PaginationControls
              page={pagination.page}
              pageCount={pagination.pageCount}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              onPageChange={pagination.setPage}
              pageSize={pagination.pageSize}
              onPageSizeChange={pagination.setPageSize}
              label={t('dashboard.tags.categories.paginationLabel')}
            />
          </div>
        </div>
      )}
      </section>
      <PromptDialog
        open={Boolean(renameDialog)}
        title={t('dashboard.tags.categories.modals.renameTitle')}
        description={t('dashboard.tags.categories.prompts.rename')}
        defaultValue={renameDialog?.currentName ?? ''}
        placeholder={t('dashboard.tags.categories.prompts.rename')}
        confirmLabel={t('dashboard.tags.categories.actions.renameTag')}
        cancelLabel={t('common.cancel')}
        submitting={renameSubmitting}
        submittingLabel={t('common.processing')}
        onConfirm={handleRenameConfirm}
        onClose={() => setRenameDialog(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteDialog)}
        title={t('dashboard.tags.categories.modals.deleteTitle')}
        description={t('dashboard.tags.categories.prompts.delete')}
        confirmLabel={t('dashboard.tags.categories.actions.deleteTag')}
        cancelLabel={t('common.cancel')}
        submitting={deleteSubmitting}
        submittingLabel={t('common.processing')}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteDialog(null)}
      />
    </>
  );
}
