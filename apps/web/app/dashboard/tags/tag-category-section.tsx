'use client';

import type { FormEvent, ReactNode } from 'react';

import type {
  GroupSummary,
  SelectionType,
  TagCategory,
  TagRequest,
} from './use-tag-management';

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
  onCategoryGroupChange: (groupId: string) => void;
  onTagNameChange: (categoryId: string, value: string) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateCategory: (
    categoryId: string,
    updates: Partial<{ is_required: boolean; selection_type: SelectionType }>
  ) => void;
  onCreateTag: (event: FormEvent<HTMLFormElement>, categoryId: string) => void;
  onToggleTagActive: (tagId: string, shouldActivate: boolean) => void;
  onSubmitTagRequest: (tagId: string) => void | Promise<void>;
  onCancelTagRequest: (requestId: string) => void | Promise<void>;
};

const CategoryScopeBadge = ({ groupName }: { groupName: string | null }) => (
  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
    {groupName ? `所属小组：${groupName}` : '组织通用'}
  </span>
);

const statusTextStyle = {
  assigned: 'text-emerald-600 dark:text-emerald-300',
  pending: 'text-amber-600 dark:text-amber-300',
  inactive: 'text-zinc-400 dark:text-zinc-500',
};

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
  onSubmitTagRequest,
  onCancelTagRequest,
}: TagCategorySectionProps) {
  const disableCreateSubmit =
    creatingCategory ||
    !newCategoryName.trim() ||
    (newCategoryScope === 'group' && !newCategoryGroupId);

  const renderTagStatus = (tagId: string, isActive: boolean) => {
    const pendingRequest = myPendingRequestsByTagId[tagId];
    const assigned = selfAssignedTagIds.has(tagId);

    if (assigned) {
      return { text: '已拥有', className: statusTextStyle.assigned };
    }

    if (pendingRequest && pendingRequest.status === 'pending') {
      return { text: '申请待审核', className: statusTextStyle.pending };
    }

    if (!isActive) {
      return { text: '标签已停用', className: statusTextStyle.inactive };
    }

    return null;
  };

  const renderTagActions = (
    tagId: string,
    isActive: boolean,
    manageable: boolean
  ): { content: ReactNode; busy: boolean } => {
    const pendingRequest = myPendingRequestsByTagId[tagId];
    const submitting = requestSubmitting.has(tagId);
    const toggling = Boolean(tagMutations[`tag-${tagId}`]);
    const cancelling = pendingRequest ? cancellationInProgress.has(pendingRequest.id) : false;

    if (manageable) {
      return {
        busy: toggling,
        content: (
          <button
            type="button"
            className="text-xs font-medium text-emerald-600 transition hover:text-emerald-500 disabled:cursor-not-allowed disabled:text-emerald-400"
            onClick={() => onToggleTagActive(tagId, !isActive)}
            disabled={toggling}
          >
            {toggling ? '更新中...' : isActive ? '停用' : '启用'}
          </button>
        ),
      };
    }

    if (!selfMemberId) {
      return { busy: false, content: null };
    }

    if (pendingRequest && pendingRequest.status === 'pending') {
      return {
        busy: cancelling,
        content: (
          <button
            type="button"
            className="text-xs font-medium text-zinc-500 underline transition hover:text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-200 dark:disabled:text-zinc-500/60"
            onClick={() => void onCancelTagRequest(pendingRequest.id)}
            disabled={cancelling || tagRequestsLoading}
          >
            {cancelling ? '撤回中...' : '撤回申请'}
          </button>
        ),
      };
    }

    if (!isActive || submitting || tagRequestsLoading || selfAssignedTagIds.has(tagId)) {
      return { busy: submitting, content: null };
    }

    return {
      busy: submitting,
      content: (
        <button
          type="button"
          className="text-xs font-medium text-emerald-600 transition hover:text-emerald-500 disabled:cursor-not-allowed disabled:text-emerald-400"
          onClick={() => void onSubmitTagRequest(tagId)}
          disabled={submitting || tagRequestsLoading}
        >
          {submitting ? '申请中...' : '申请标签'}
        </button>
      ),
    };
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">标签类别</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          标签类别用于按“性别”“学科”“职务”等维度组织成员标签，可设置为单选或多选，并可绑定到指定小组，帮助在指派任务时快速筛选目标成员。
        </p>
      </div>

      {orgGroupsError ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {orgGroupsError}
        </div>
      ) : null}

      {canManageAnyCategory ? (
        <form
          onSubmit={onCreateCategory}
          className="space-y-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900/50 dark:bg-emerald-900/10"
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">类别名称</span>
              <input
                className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-300 dark:border-emerald-900/60 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-700"
                placeholder="例如：学科、年级、职务"
                value={newCategoryName}
                onChange={(event) => onCategoryNameChange(event.target.value)}
                maxLength={60}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">选择方式</span>
              <select
                className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-300 dark:border-emerald-900/60 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-700"
                value={newCategorySelection}
                onChange={(event) => onCategorySelectionChange(event.target.value as SelectionType)}
              >
                <option value="single">单选（仅允许选择一个标签）</option>
                <option value="multiple">多选（可以选择多个标签）</option>
              </select>
            </label>
            <label className="flex items-end gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-zinc-900"
                checked={newCategoryRequired}
                onChange={(event) => onCategoryRequiredChange(event.target.checked)}
              />
              <span>成员加入组织时必须填写</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">适用范围</span>
              {isOrgAdmin ? (
                <select
                  className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-300 dark:border-emerald-900/60 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-700"
                  value={newCategoryScope}
                  onChange={(event) => onCategoryScopeChange(event.target.value as 'organization' | 'group')}
                >
                  <option value="organization">组织通用（全部成员可见）</option>
                  <option value="group">绑定到指定小组</option>
                </select>
              ) : (
                <div className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-emerald-900/60 dark:bg-zinc-900 dark:text-zinc-100">
                  仅可绑定到我管理的小组
                </div>
              )}
            </label>
            {newCategoryScope === 'group' ? (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">绑定小组</span>
                <select
                  className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-300 dark:border-emerald-900/60 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-700"
                  value={newCategoryGroupId ?? ''}
                  onChange={(event) => onCategoryGroupChange(event.target.value)}
                  disabled={orgGroupsLoading || groupOptions.length === 0}
                  required
                >
                  <option value="">请选择小组</option>
                  {groupOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {orgGroupsLoading ? (
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">正在加载可管理的小组...</span>
                ) : groupOptions.length === 0 ? (
                  <span className="text-[11px] text-amber-600 dark:text-amber-300">
                    当前没有可管理的小组，暂时无法创建小组专属标签。
                  </span>
                ) : null}
              </label>
            ) : null}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
              disabled={disableCreateSubmit}
            >
              {creatingCategory ? '创建中...' : '新增类别'}
            </button>
          </div>
        </form>
      ) : null}

      {categoriesLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载标签类别...
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          尚未创建标签类别。
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const manageable = manageableCategoryIds.has(category.id);
            const updating = categoryUpdating[category.id] ?? false;
            const selectionLabel = selectionTypeLabels[category.selectionType];
            const requirementLabel = category.isRequired ? '必选' : '可选';
            const createBusy = Boolean(tagMutations[`create-${category.id}`]);

            return (
              <div
                key={category.id}
                className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{category.name}</h3>
                      <CategoryScopeBadge groupName={category.groupName} />
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectionLabel} · {requirementLabel}
                    </div>
                  </div>
                  {manageable ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                          checked={category.isRequired}
                          onChange={() =>
                            onUpdateCategory(category.id, { is_required: !category.isRequired })
                          }
                          disabled={updating}
                        />
                        <span>成员加入时必须选择</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <span>选择方式</span>
                        <select
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                          value={category.selectionType}
                          onChange={(event) =>
                            onUpdateCategory(category.id, {
                              selection_type: event.target.value as SelectionType,
                            })
                          }
                          disabled={updating}
                        >
                          <option value="single">单选</option>
                          <option value="multiple">多选</option>
                        </select>
                      </label>
                      {updating ? (
                        <span className="text-emerald-600 dark:text-emerald-300">更新中...</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {category.tags.length === 0 ? (
                    <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                      该类别尚未创建标签。
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {category.tags.map((tag) => {
                        const status = renderTagStatus(tag.id, tag.isActive);
                        const { content: action, busy } = renderTagActions(tag.id, tag.isActive, manageable);

                        return (
                          <li
                            key={tag.id}
                            className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60"
                          >
                            <div className="flex flex-col gap-1">
                              <span
                                className={
                                  tag.isActive
                                    ? 'text-sm text-zinc-700 dark:text-zinc-100'
                                    : 'text-sm text-zinc-400 line-through'
                                }
                              >
                                {tag.name}
                                {!tag.isActive ? '（已停用）' : ''}
                              </span>
                              {status ? (
                                <span className={`text-[11px] ${status.className}`}>{status.text}</span>
                              ) : null}
                            </div>
                            {action}
                            {busy && !action ? (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-300">
                                处理中...
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {manageable ? (
                  <form
                    onSubmit={(event) => onCreateTag(event, category.id)}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <input
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder="输入标签名称，例如：语文、班主任"
                      value={newTagNames[category.id] ?? ''}
                      onChange={(event) => onTagNameChange(category.id, event.target.value)}
                      maxLength={60}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
                      disabled={createBusy || !(newTagNames[category.id] ?? '').trim()}
                    >
                      {createBusy ? '添加中...' : '新增标签'}
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
