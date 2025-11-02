'use client';

import type {
  AttachmentDraft,
  GroupMember,
  TagSelectionType,
  TaskTagCategory,
} from '../types';
import { formInputClass } from '../types';

type TaskComposerProps = {
  open: boolean;
  onClose: () => void;
  groupName: string | null;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  dueAt: string;
  setDueAt: (value: string) => void;
  creating: boolean;
  error: string | null;
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
  open,
  onClose,
  groupName,
  title,
  setTitle,
  description,
  setDescription,
  dueAt,
  setDueAt,
  creating,
  error,
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
  if (!open) return null;

  const disableInputs = creating || attachmentsUploading;

  const renderContent = () => {
    if (!groupName) {
      return (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          请先选择一个小组，再创建任务。
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">任务标题</label>
            <input
              className={formInputClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：收集第三季度市场反馈"
              disabled={disableInputs}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              截止时间（可选）
            </label>
            <input
              type="datetime-local"
              className={formInputClass}
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              disabled={disableInputs}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            任务说明（可选）
          </label>
          <textarea
            className="min-h-[120px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="补充执行细节、成果要求或参考资料链接等。"
            disabled={disableInputs}
          />
        </div>

        <div className="space-y-1">
          <label className="flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-200">
            <span>附件要求</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              勾选后，成员完成任务时需上传附件。
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900"
              checked={requireAttachment}
              onChange={(event) => setRequireAttachment(event.target.checked)}
              disabled={disableInputs}
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-300">需要成员提交附件</span>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">根据标签筛选</h3>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                onClick={resetTagFilters}
                disabled={disableInputs || !hasActiveFilters}
              >
                清除筛选
              </button>
            </div>
          </div>

          {tagCategoriesLoading ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">正在加载标签...</p>
          ) : filterableCategories.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              尚未配置标签类别，可在“标签管理”中预设常用分类。
            </p>
          ) : (
            <div className="space-y-3">
              {filterableCategories.map((category) => (
                <div key={category.id} className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {category.name}{' '}
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      {tagSelectionLabels[category.selectionType]}
                      {category.isRequired ? ' · 必填标签' : ''}
                    </span>
                  </div>
                  {category.selectionType === 'single' ? (
                    <select
                      className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                      value={tagFilters[category.id]?.[0] ?? ''}
                      onChange={(event) => handleTagFilterSingleChange(category.id, event.target.value)}
                      disabled={disableInputs}
                    >
                      <option value="">不限标签</option>
                      {category.tags.map((tag) => (
                        <option key={tag.id} value={tag.id} disabled={!tag.isActive}>
                          {tag.name}
                          {!tag.isActive ? '（已停用）' : ''}
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
                              disabled={disableInputs || (!tag.isActive && !checked)}
                            />
                            <span>
                              {tag.name}
                              {!tag.isActive ? '（已停用）' : ''}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {hasActiveFilters ? (
                <div className="text-xs text-emerald-600 dark:text-emerald-300">
                  已应用 {activeFilterCount} 项标签筛选。
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">选择执行成员</h3>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                onClick={selectAll}
                disabled={disableInputs || filteredMembers.length === 0}
              >
                全选当前名单
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400">正在加载小组成员...</p>
            ) : totalMembers === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                当前小组暂无成员，请先在“小组管理”中邀请成员加入。
              </p>
            ) : filteredMembers.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                在当前筛选条件下，没有符合要求的成员。
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredMembers.map((member) => (
                  <label
                    key={member.userId}
                    className="flex items-center justify-between rounded-md border border-transparent px-2 py-1 text-sm text-zinc-600 hover:border-zinc-200 dark:text-zinc-300 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900"
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">任务附件</h3>
            <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
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
          {attachmentsError ? (
            <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {attachmentsError}
            </div>
          ) : null}
          {attachmentDrafts.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">尚未附加文件。</p>
          ) : (
            <ul className="space-y-2">
              {attachmentDrafts.map((draft) => (
                <li
                  key={draft.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-200">{draft.file.name}</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(draft.file.size)} · {draft.file.type || '未知类型'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    onClick={() => removeAttachmentDraft(draft.id)}
                    disabled={disableInputs}
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="relative w-full max-w-4xl space-y-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              新建任务
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {groupName ? (
                <>
                  将任务派发至 <span className="font-medium text-zinc-900 dark:text-zinc-100">{groupName}</span>
                  ，支持标签筛选、附件要求与多成员指派。
                </>
              ) : (
                '请选择目标小组后再创建任务。'
              )}
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            onClick={onClose}
          >
            关闭
          </button>
        </div>

        {error ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {renderContent()}

        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-6 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
            onClick={onCreate}
            disabled={disableInputs || !title.trim() || !groupName}
          >
            {creating ? '创建中...' : '创建任务'}
          </button>
        </div>
      </div>
    </div>
  );
}
