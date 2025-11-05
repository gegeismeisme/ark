'use client';

import { useEffect, useMemo, useState } from 'react';

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
  mode: 'create' | 'edit';
  open: boolean;
  onClose: () => void;
  groupName: string | null;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  dueAt: string;
  setDueAt: (value: string) => void;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
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
  return `已添加 ${drafts.length} 个附件`;
};

export function TaskComposer({
  mode,
  open,
  onClose,
  groupName,
  title,
  setTitle,
  description,
  setDescription,
  dueAt,
  setDueAt,
  submitting,
  error,
  onSubmit,
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

  useEffect(() => {
    if (mode === 'edit') {
      setSelectionPanelOpen(false);
    }
  }, [mode]);

  const attachmentSummary = useMemo(
    () => getAttachmentSummary(attachmentDrafts),
    [attachmentDrafts],
  );

  const assigneeSummary = useMemo(() => {
    if (membersLoading) return '成员列表加载中';
    if (selectedAssignees.length === 0) return '尚未选择成员';
    return `已选择 ${selectedAssignees.length} 人`;
  }, [membersLoading, selectedAssignees.length]);

  const filterSummary = useMemo(() => {
    if (!hasActiveFilters) return '未设置标签筛选';
    if (activeFilterCount === 1) return '已启用 1 项标签筛选';
    return `已启用 ${activeFilterCount} 项标签筛选`;
  }, [hasActiveFilters, activeFilterCount]);

  const disableInputs = submitting || attachmentsUploading;
  const editing = mode === 'edit';

  const heading = editing ? '编辑任务' : '新建任务';
  const subtitle = groupName ? `当前小组：${groupName}` : '请选择目标小组后再创建任务';
  const actionLabel = editing ? '保存修改' : '创建任务';
  const pendingLabel = editing ? '保存中...' : '创建中...';

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,11,19,0.76)] px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)] shadow-[0_48px_140px_-64px_rgba(8,13,20,0.85)]">
        {selectionPanelOpen && !editing ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(5,11,19,0.75)] px-4 py-6 backdrop-blur-sm">
            <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)] shadow-[0_32px_120px_-60px_rgba(8,13,20,0.75)]">
              <div className="flex flex-col gap-3 border-b border-[var(--ark-border-subtle)] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--ark-text-primary)]">执行对象配置</h3>
                  <p className="mt-1 text-sm text-[var(--ark-text-secondary)]">
                    通过标签筛选成员并批量选择，完成后点击“完成配置”保存结果。
                  </p>
                </div>
                <button
                  type="button"
                  className="self-start text-sm font-semibold text-[var(--ark-text-secondary)] underline decoration-dashed underline-offset-4 hover:text-[var(--ark-text-primary)]"
                  onClick={() => setSelectionPanelOpen(false)}
                >
                  关闭
                </button>
              </div>
              <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/70 p-5">
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
                <div className="rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/70 p-5">
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
              <div className="flex flex-col gap-3 border-t border-[var(--ark-border-subtle)] px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--ark-border-subtle)] px-4 py-2 text-sm font-medium text-[var(--ark-text-secondary)] transition hover:bg-[var(--ark-panel-surface)]/60 hover:text-[var(--ark-text-primary)] disabled:opacity-60"
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
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--ark-accent)] px-4 py-2 text-sm font-semibold text-[var(--ark-text-inverse)] shadow-[0_18px_38px_-24px_rgba(36,180,126,0.9)] transition hover:translate-y-[-1px]"
                  onClick={() => setSelectionPanelOpen(false)}
                  disabled={disableInputs}
                >
                  完成配置
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <header className="flex flex-col gap-3 border-b border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/90 px-7 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--ark-text-primary)]">{heading}</h2>
            <p className="mt-1 text-sm text-[var(--ark-text-secondary)]">{subtitle}</p>
          </div>
          <button
            type="button"
            className="self-start rounded-full border border-[var(--ark-border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--ark-text-secondary)] transition hover:border-[var(--ark-accent)] hover:text-[var(--ark-text-primary)]"
            onClick={onClose}
          >
            关闭
          </button>
        </header>

        {error ? (
          <div className="mx-7 mt-4 rounded-xl border border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.12)] px-4 py-3 text-sm font-medium text-[var(--ark-text-primary)] shadow-[0_24px_60px_-40px_rgba(248,113,113,0.65)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-8 px-7 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--ark-text-secondary)]">任务标题</label>
                <input
                  className={`${formInputClass} bg-[var(--ark-panel-surface)]/70 text-[var(--ark-text-primary)]`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：收集三年级市场调研反馈"
                  disabled={disableInputs}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--ark-text-secondary)]">截止时间（可选）</label>
                <input
                  type="datetime-local"
                  className={`${formInputClass} bg-[var(--ark-panel-surface)]/70 text-[var(--ark-text-primary)]`}
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  disabled={disableInputs}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-[var(--ark-text-secondary)]">任务说明（可选）</label>
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/70 px-4 py-3 text-sm text-[var(--ark-text-primary)] outline-none transition focus:border-[var(--ark-accent)] focus:ring-2 focus:ring-[var(--ark-accent)]/35 disabled:opacity-60"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="补充执行步骤、成果要求或参考资料链接等信息。"
                  disabled={disableInputs}
                />
              </div>
            </section>

            <section className="space-y-2 rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/60 px-5 py-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ark-text-secondary)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--ark-border-subtle)] text-[var(--ark-accent)] focus:ring-[var(--ark-accent)]"
                  checked={requireAttachment}
                  onChange={(event) => setRequireAttachment(event.target.checked)}
                  disabled={disableInputs}
                />
                要求成员提交附件
              </label>
              <p className="text-xs text-[var(--ark-text-tertiary)]">
                启用后，成员完成任务时需上传至少一个附件，便于验收结果。
              </p>
            </section>

            {editing ? (
              <section className="rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/60 px-5 py-4 text-xs text-[var(--ark-text-secondary)]">
                编辑模式暂不支持调整执行成员与附件，请前往任务详情进行管理。
              </section>
            ) : (
              <>
                <section className="space-y-3 rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/60 px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--ark-text-secondary)]">执行对象配置</h3>
                      <p className="text-xs text-[var(--ark-text-tertiary)]">{assigneeSummary}</p>
                      <p className="text-xs text-[var(--ark-text-tertiary)]">{filterSummary}</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-[var(--ark-border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--ark-text-secondary)] transition hover:bg-[var(--ark-panel-surface)]/60 hover:text-[var(--ark-text-primary)] disabled:opacity-60"
                      onClick={() => setSelectionPanelOpen(true)}
                      disabled={disableInputs}
                    >
                      配置成员与标签
                    </button>
                  </div>
                  <p className="text-xs text-[var(--ark-text-tertiary)]">
                    支持按标签筛选成员并批量选择，可覆盖已有选择。
                  </p>
                </section>

                <section className="space-y-3 rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/60 px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--ark-text-secondary)]">任务附件</h3>
                      <p className="text-xs text-[var(--ark-text-tertiary)]">{attachmentSummary}</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--ark-border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--ark-text-secondary)] transition hover:bg-[var(--ark-panel-surface)]/60 hover:text-[var(--ark-text-primary)] disabled:opacity-60">
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
                    <div className="rounded-xl border border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.12)] px-3 py-2 text-xs font-medium text-[var(--ark-text-primary)]">
                      {attachmentsError}
                    </div>
                  ) : null}
                  {attachmentDrafts.length === 0 ? (
                    <p className="text-xs text-[var(--ark-text-tertiary)]">尚未添加文件。</p>
                  ) : (
                    <ul className="grid max-h-56 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                      {attachmentDrafts.map((draft) => (
                        <li
                          key={draft.id}
                          className="rounded-xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/70 px-3 py-2 text-xs text-[var(--ark-text-secondary)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-[var(--ark-text-primary)]">{draft.file.name}</div>
                              <div className="mt-1 text-[10px] uppercase tracking-wide text-[var(--ark-text-tertiary)]">
                                {formatFileSize(draft.file.size)} · {draft.file.type || '未知类型'}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="text-xs font-semibold text-[var(--ark-text-tertiary)] underline underline-offset-4 hover:text-[var(--ark-text-primary)]"
                              onClick={() => removeAttachmentDraft(draft.id)}
                              disabled={disableInputs}
                            >
                              移除
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>

          <aside className="space-y-4 rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/60 px-5 py-5">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[var(--ark-text-secondary)]">任务概览</h4>
              <p className="text-xs text-[var(--ark-text-tertiary)]">
                标题、时间、说明与附件要求将在成员端展示，请填写清晰、易于执行的内容。
              </p>
            </div>
            {!editing ? (
              <div className="space-y-2 text-xs text-[var(--ark-text-tertiary)]">
                <p>成员筛选与选择将在“配置成员与标签”面板中完成。</p>
                <p>附件草稿仅在任务创建时上传，编辑任务暂不支持追加草稿附件。</p>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-[var(--ark-text-tertiary)]">
                <p>当前模式下可修改任务基础信息与附件要求。</p>
                <p>执行成员、标签与附件管理请前往任务详情页操作。</p>
              </div>
            )}
          </aside>
        </div>

        <footer className="flex justify-end border-t border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/90 px-7 py-5">
          <button
            type="button"
            className="inline-flex h-11 min-w-[144px] items-center justify-center rounded-xl bg-[var(--ark-accent)] px-6 text-sm font-semibold text-[var(--ark-text-inverse)] shadow-[0_24px_56px_-32px_rgba(36,180,126,0.9)] transition hover:translate-y-[-1px] hover:bg-[var(--ark-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSubmit}
            disabled={disableInputs || !groupName || !title.trim()}
          >
            {submitting ? pendingLabel : actionLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
