'use client';

import { useMemo, useState } from 'react';

import { formInputClass } from '../types';
import type {
  AttachmentDraft,
  GroupMember,
  TagSelectionType,
  TaskTagCategory,
} from '../types';
import { TaskComposerAssigneeSelector } from './TaskComposerAssigneeSelector';
import { TaskComposerTagFilters } from './TaskComposerTagFilters';

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

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
};

const getAttachmentSummary = (drafts: AttachmentDraft[]) => {
  if (!drafts.length) return '尚未添加文件';
  if (drafts.length === 1) return drafts[0].file.name;
  return `已添加 ${drafts.length} 个文件`;
};

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
  const [selectionPanelOpen, setSelectionPanelOpen] = useState(false);

  const attachmentSummary = useMemo(
    () => getAttachmentSummary(attachmentDrafts),
    [attachmentDrafts],
  );

  const assigneeSummary = useMemo(() => {
    if (membersLoading) return '成员列表加载中…';
    if (selectedAssignees.length === 0) return '尚未选择成员';
    return `已选择 ${selectedAssignees.length} 人`;
  }, [membersLoading, selectedAssignees.length]);

  const filterSummary = useMemo(() => {
    if (!hasActiveFilters) return '未设置标签筛选';
    if (activeFilterCount === 1) return '已启用 1 项标签筛选';
    return `已启用 ${activeFilterCount} 项标签筛选`;
  }, [hasActiveFilters, activeFilterCount]);

  const disableInputs = creating || attachmentsUploading;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="relative flex w-full max-w-5xl flex-col gap-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        {selectionPanelOpen ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-6">
            <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-950">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">成员与标签</h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    组合标签筛选与执行成员，完成后点击“完成配置”保存选择。
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  onClick={() => setSelectionPanelOpen(false)}
                >
                  关闭
                </button>
              </div>

              <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-4 md:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <TaskComposerTagFilters
                    loading={tagCategoriesLoading}
                    categories={filterableCategories}
                    filters={tagFilters}
                    selectionLabels={tagSelectionLabels}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onReset={resetTagFilters}
                    onSingleChange={handleTagFilterSingleChange}
                    onToggle={handleTagFilterToggle}
                    disabled={disableInputs}
                  />
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <TaskComposerAssigneeSelector
                    loading={membersLoading}
                    totalMembers={totalMembers}
                    members={filteredMembers}
                    selectedAssignees={selectedAssignees}
                    onToggle={toggleAssignee}
                    onSelectAll={selectAll}
                    onClear={clearAssignees}
                    disabled={disableInputs}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => {
                    resetTagFilters();
                    clearAssignees();
                  }}
                  disabled={disableInputs}
                >
                  清除全部
                </button>
                <button
                  type="button"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
                  onClick={() => setSelectionPanelOpen(false)}
                  disabled={disableInputs}
                >
                  完成配置
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">新建任务</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {groupName
                ? (
                    <>
                      将任务发送至{' '}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{groupName}</span>
                      ，可同时配置标签筛选、附件要求和执行成员。
                    </>
                  )
                : '请选择目标小组后再创建任务。'}
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

        <div className="space-y-5">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">任务标题</label>
              <input
                className={formInputClass}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：收集三年级市场调研表"
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
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                任务说明（可选）
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="补充执行步骤、成果要求或参考资料链接等。"
                disabled={disableInputs}
              />
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <label className="flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900"
                checked={requireAttachment}
                onChange={(event) => setRequireAttachment(event.target.checked)}
                disabled={disableInputs}
              />
              要求成员提交附件
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              启用后，成员在完成任务时需上传至少一个附件，便于核验执行结果。
            </p>
          </section>

          <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">执行对象配置</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{assigneeSummary}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{filterSummary}</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => setSelectionPanelOpen(true)}
                disabled={disableInputs}
              >
                配置成员与标签
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              可按标签筛选成员并进行批量选择，支持覆盖已有选择。
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">任务附件</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{attachmentSummary}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400">尚未添加文件。</p>
            ) : (
              <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
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
          </section>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-6 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
            onClick={onCreate}
            disabled={disableInputs || !groupName || !title.trim()}
          >
            {creating ? '创建中…' : '创建任务'}
          </button>
        </div>
      </div>
    </div>
  );
}
