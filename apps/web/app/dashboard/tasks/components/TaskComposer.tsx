'use client';

import type {
  GroupMember,
  TagSelectionType,
  TaskTagCategory,
} from '../types';
import { formInputClass } from '../types';

type TaskComposerProps = {
  groupName: string | null;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  dueAt: string;
  setDueAt: (value: string) => void;
  creating: boolean;
  onCreate: () => void;
  selectedAssignees: string[];
  toggleAssignee: (userId: string) => void;
  selectAll: () => void;
  clearAssignees: () => void;
  filteredMembers: GroupMember[];
  membersLoading: boolean;
  totalMembers: number;
  tagCategoriesLoading: boolean;
  filterableCategories: TaskTagCategory[];
  tagFilters: Record<string, string[]>;
  tagSelectionLabels: Record<TagSelectionType, string>;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  resetTagFilters: () => void;
  handleTagFilterSingleChange: (categoryId: string, value: string) => void;
  handleTagFilterToggle: (categoryId: string, tagId: string, checked: boolean) => void;
};

export function TaskComposer({
  groupName,
  title,
  setTitle,
  description,
  setDescription,
  dueAt,
  setDueAt,
  creating,
  onCreate,
  selectedAssignees,
  toggleAssignee,
  selectAll,
  clearAssignees,
  filteredMembers,
  membersLoading,
  totalMembers,
  tagCategoriesLoading,
  filterableCategories,
  tagFilters,
  tagSelectionLabels,
  hasActiveFilters,
  activeFilterCount,
  resetTagFilters,
  handleTagFilterSingleChange,
  handleTagFilterToggle,
}: TaskComposerProps) {
  if (!groupName) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        请选择一个小组以创建任务。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        向「{groupName}」发布任务
      </h2>
      <div className="mt-4 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">标题</label>
          <input
            className={formInputClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="输入任务标题"
            disabled={creating}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">说明（可选）</label>
          <textarea
            className="min-h-[96px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="补充任务细节、提交要求等"
            disabled={creating}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            截止时间（可选）
          </label>
          <input
            type="datetime-local"
            className={formInputClass}
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={creating}
          />
        </div>

        <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">指派成员</span>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                className="text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 disabled:cursor-not-allowed disabled:text-zinc-400/70 dark:disabled:text-zinc-500/60"
                onClick={selectAll}
                disabled={creating || filteredMembers.length === 0}
              >
                全选
              </button>
              <button
                type="button"
                className="text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 disabled:cursor-not-allowed disabled:text-zinc-400/70 dark:disabled:text-zinc-500/60"
                onClick={clearAssignees}
                disabled={creating || selectedAssignees.length === 0}
              >
                清空
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {tagCategoriesLoading ? (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                正在加载标签...
              </div>
            ) : filterableCategories.length > 0 ? (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">按标签筛选成员</span>
                  <button
                    type="button"
                    className="text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 disabled:cursor-not-allowed disabled:text-zinc-400/70 dark:disabled:text-zinc-500/60"
                    onClick={resetTagFilters}
                    disabled={!hasActiveFilters}
                  >
                    清空筛选
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {filterableCategories.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">{category.name}</span>
                        <span>
                          {tagSelectionLabels[category.selectionType]}
                          {category.isRequired ? ' · 必选' : ''}
                        </span>
                      </div>
                      {category.selectionType === 'single' ? (
                        <select
                          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          value={tagFilters[category.id]?.[0] ?? ''}
                          onChange={(event) =>
                            handleTagFilterSingleChange(category.id, event.target.value)
                          }
                        >
                          <option value="">不限</option>
                          {category.tags.map((tag) => (
                            <option
                              key={tag.id}
                              value={tag.id}
                              disabled={!tag.isActive && tagFilters[category.id]?.[0] !== tag.id}
                            >
                              {tag.name}
                              {!tag.isActive ? '（停用）' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {category.tags.map((tag) => {
                            const checked = tagFilters[category.id]?.includes(tag.id) ?? false;
                            return (
                              <label
                                key={tag.id}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                                  checked
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'
                                    : 'border-zinc-300 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900"
                                  checked={checked}
                                  onChange={(event) =>
                                    handleTagFilterToggle(category.id, tag.id, event.target.checked)
                                  }
                                  disabled={!tag.isActive && !checked}
                                />
                                <span>
                                  {tag.name}
                                  {!tag.isActive ? '（停用）' : ''}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  {hasActiveFilters ? (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-300">
                      已应用 {activeFilterCount} 个标签筛选
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              {membersLoading ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">正在加载小组成员...</p>
              ) : totalMembers === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  小组暂无成员，请先在“小组管理”中添加成员。
                </p>
              ) : filteredMembers.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  当前筛选条件下没有符合的成员。
                </p>
              ) : (
                filteredMembers.map((member) => (
                  <label
                    key={member.userId}
                    className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                      checked={selectedAssignees.includes(member.userId)}
                      onChange={() => toggleAssignee(member.userId)}
                      disabled={creating}
                    />
                    <span>
                      {member.fullName ?? member.userId.slice(0, 8)}
                      {member.role === 'admin'
                        ? ' · 管理员'
                        : member.role === 'publisher'
                          ? ' · 发布者'
                          : ''}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          onClick={onCreate}
          disabled={creating || !title.trim()}
        >
          {creating ? '创建中...' : '创建任务'}
        </button>
      </div>
    </div>
  );
}
