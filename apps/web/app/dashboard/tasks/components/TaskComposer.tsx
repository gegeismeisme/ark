'use client';

import type {
  AttachmentDraft,
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
  requireAttachment: boolean;
  setRequireAttachment: (value: boolean) => void;
  attachmentDrafts: AttachmentDraft[];
  addAttachmentDrafts: (files: FileList | null) => void;
  removeAttachmentDraft: (id: string) => void;
  attachmentsUploading: boolean;
  attachmentsError: string | null;
};

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
}

function renderMemberRole(role: GroupMember['role']) {
  if (role === 'admin') return ' · 管理员';
  if (role === 'publisher') return ' · 发布人';
  return '';
}

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
  requireAttachment,
  setRequireAttachment,
  attachmentDrafts,
  addAttachmentDrafts,
  removeAttachmentDraft,
  attachmentsUploading,
  attachmentsError,
}: TaskComposerProps) {
  if (!groupName) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        请选择一个小组后再创建任务。
      </div>
    );
  }

  const disableInputs = creating || attachmentsUploading;

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
            disabled={disableInputs}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            说明（可选）
          </label>
          <textarea
            className="min-h-[96px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="补充任务细节、验收标准或注意事项"
            disabled={disableInputs}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              截止时间（可选）
            </label>
            <input
              type="datetime-local"
              className={formInputClass}
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              disabled={disableInputs}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              未设置时默认按任务发布时间提示执行。
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/40">
            <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                checked={requireAttachment}
                onChange={(event) => setRequireAttachment(event.target.checked)}
                disabled={disableInputs}
              />
              <span>完成任务时必须上传附件</span>
            </label>
            <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              可用于要求学员提交照片、文档或其他证明材料。移动端会同步提示需要上传。
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">任务附件</span>
            <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => addAttachmentDrafts(event.target.files)}
                disabled={disableInputs}
              />
              选择文件
            </label>
          </div>

          {attachmentsUploading ? (
            <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              正在上传附件，请稍候……
            </div>
          ) : null}

          {attachmentsError ? (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {attachmentsError}
            </div>
          ) : null}

          {attachmentDrafts.length ? (
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              {attachmentDrafts.map((draft) => (
                <li
                  key={draft.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-200">
                      {draft.file.name}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(draft.file.size)} · {draft.file.type || '未知类型'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-300"
                    onClick={() => removeAttachmentDraft(draft.id)}
                    disabled={disableInputs}
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              支持常见图片、PDF、Office 文档及压缩包，单个文件不超过 20MB。
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">标签筛选</h3>
            {hasActiveFilters ? (
              <button
                type="button"
                className="text-xs text-emerald-600 hover:text-emerald-500 dark:text-emerald-300"
                onClick={resetTagFilters}
                disabled={tagCategoriesLoading}
              >
                重置筛选
              </button>
            ) : null}
          </div>

          {tagCategoriesLoading ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">正在加载标签分类…</p>
          ) : filterableCategories.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">暂无可用标签。</p>
          ) : (
            <div className="space-y-4">
              {filterableCategories.map((category) => (
                <div key={category.id} className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {category.name}
                        {category.isRequired ? (
                          <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-300">
                            必填
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {tagSelectionLabels[category.selectionType]}
                        {category.groupName ? ` · 限${category.groupName}` : ''}
                      </div>
                    </div>
                    {tagFilters[category.id]?.length ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-300">
                        已选 {tagFilters[category.id].length} 项
                      </span>
                    ) : null}
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
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
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
                  已应用 {activeFilterCount} 个标签筛选条件。
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">选择执行成员</h3>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                onClick={selectAll}
                disabled={disableInputs || filteredMembers.length === 0}
              >
                全选当前筛选结果
              </button>
              <span className="text-zinc-300 dark:text-zinc-600">|</span>
              <button
                type="button"
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                onClick={clearAssignees}
                disabled={disableInputs || selectedAssignees.length === 0}
              >
                清空
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            {membersLoading ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">正在加载小组成员…</p>
            ) : totalMembers === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                当前小组还没有成员，请先在「小组管理」中添加成员。
              </p>
            ) : filteredMembers.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                在当前筛选条件下，没有符合要求的成员。
              </p>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <label
                    key={member.userId}
                    className="flex items-center justify-between rounded-md border border-transparent px-2 py-1 text-sm text-zinc-600 hover:border-zinc-200 dark:text-zinc-300 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        checked={selectedAssignees.includes(member.userId)}
                        onChange={() => toggleAssignee(member.userId)}
                        disabled={disableInputs}
                      />
                      <span>
                        {member.fullName ?? member.userId.slice(0, 8)}
                        {renderMemberRole(member.role)}
                      </span>
                    </div>
                    {member.orgRole ? (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        组织角色：{member.orgRole}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-500/60"
          onClick={onCreate}
          disabled={disableInputs || !title.trim()}
        >
          {creating ? '创建中…' : '创建任务'}
        </button>
      </div>
    </div>
  );
}
