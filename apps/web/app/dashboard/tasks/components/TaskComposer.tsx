'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from '@/lib/i18n/client';

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
  const t = useTranslations();
  const [selectionPanelOpen, setSelectionPanelOpen] = useState(false);

  useEffect(() => {
    if (mode === 'edit') {
      setSelectionPanelOpen(false);
    }
  }, [mode]);

  const attachmentSummary = useMemo(() => {
    if (!attachmentDrafts.length) {
      return t('dashboard.tasks.composer.attachments.summary.empty');
    }
    if (attachmentDrafts.length === 1) {
      return attachmentDrafts[0].file.name;
    }
    return t('dashboard.tasks.composer.attachments.summary.count', {
      count: attachmentDrafts.length,
    });
  }, [attachmentDrafts, t]);

  const assigneeSummary = useMemo(() => {
    if (membersLoading) {
      return t('dashboard.tasks.composer.assignees.loading');
    }
    if (selectedAssignees.length === 0) {
      return t('dashboard.tasks.composer.assignees.none');
    }
    return t('dashboard.tasks.composer.assignees.selected', {
      count: selectedAssignees.length,
    });
  }, [membersLoading, selectedAssignees.length, t]);

  const filterSummary = useMemo(() => {
    if (!hasActiveFilters) {
      return t('dashboard.tasks.composer.filters.none');
    }
    if (activeFilterCount === 1) {
      return t('dashboard.tasks.composer.filters.single');
    }
    return t('dashboard.tasks.composer.filters.count', {
      count: activeFilterCount,
    });
  }, [activeFilterCount, hasActiveFilters, t]);

  const disableInputs = submitting || attachmentsUploading;
  const editing = mode === 'edit';
  const showAssigneeWarning = !editing && selectedAssignees.length === 0;

  const heading = editing
    ? t('dashboard.tasks.composer.heading.edit')
    : t('dashboard.tasks.composer.heading.create');
  const subtitle = groupName
    ? t('dashboard.tasks.composer.subtitle.selectedGroup', { group: groupName })
    : t('dashboard.tasks.composer.subtitle.missingGroup');
  const actionLabel = editing
    ? t('dashboard.tasks.composer.actions.save')
    : t('dashboard.tasks.composer.actions.create');
  const pendingLabel = editing
    ? t('dashboard.tasks.composer.actions.saving')
    : t('dashboard.tasks.composer.actions.creating');

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
                  <h3 className="text-lg font-semibold text-[var(--ark-text-primary)]">
                    {t('dashboard.tasks.composer.selectionPanel.title')}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--ark-text-secondary)]">
                    {t('dashboard.tasks.composer.selectionPanel.description')}
                  </p>
                </div>
                <button
                  type="button"
                  className="self-start text-sm font-semibold text-[var(--ark-text-secondary)] underline decoration-dashed underline-offset-4 hover:text-[var(--ark-text-primary)]"
                  onClick={() => setSelectionPanelOpen(false)}
                >
                  {t('common.close')}
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
                  {t('dashboard.tasks.composer.selectionPanel.reset')}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--ark-accent)] px-4 py-2 text-sm font-semibold text-[var(--ark-text-inverse)] shadow-[0_18px_38px_-24px_rgba(36,180,126,0.9)] transition hover:translate-y-[-1px]"
                  onClick={() => setSelectionPanelOpen(false)}
                  disabled={disableInputs}
                >
                  {t('dashboard.tasks.composer.selectionPanel.confirm')}
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
            {t('common.close')}
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
                <label className="text-sm font-semibold text-[var(--ark-text-secondary)]">
                  {t('dashboard.tasks.composer.form.title')}
                </label>
                <input
                  className={`${formInputClass} bg-[var(--ark-panel-surface)]/70 text-[var(--ark-text-primary)]`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('dashboard.tasks.composer.form.titlePlaceholder')}
                  disabled={disableInputs}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--ark-text-secondary)]">
                  {t('dashboard.tasks.composer.form.dueAt')}
                </label>
                <input
                  type="datetime-local"
                  className={`${formInputClass} bg-[var(--ark-panel-surface)]/70 text-[var(--ark-text-primary)]`}
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  disabled={disableInputs}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-[var(--ark-text-secondary)]">
                  {t('dashboard.tasks.composer.form.description')}
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/70 px-4 py-3 text-sm text-[var(--ark-text-primary)] outline-none transition focus:border-[var(--ark-accent)] focus:ring-2 focus:ring-[var(--ark-accent)]/35 disabled:opacity-60"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t('dashboard.tasks.composer.form.descriptionPlaceholder')}
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
                {t('dashboard.tasks.composer.attachments.requirement')}
              </label>
              <p className="text-xs text-[var(--ark-text-tertiary)]">
                {t('dashboard.tasks.composer.attachments.requirementHint')}
              </p>
            </section>

            {editing ? (
              <section className="rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/60 px-5 py-4 text-xs text-[var(--ark-text-secondary)]">
                {t('dashboard.tasks.composer.attachments.editingNotice')}
              </section>
            ) : (
              <>
                <section className="space-y-3 rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/60 px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--ark-text-secondary)]">
                        {t('dashboard.tasks.composer.assignmentCard.title')}
                      </h3>
                      <p className="text-xs text-[var(--ark-text-tertiary)]">{assigneeSummary}</p>
                      <p className="text-xs text-[var(--ark-text-tertiary)]">{filterSummary}</p>
                      {showAssigneeWarning ? (
                        <p className="text-xs font-medium text-[rgba(248,113,113,0.95)]">
                          {t('dashboard.tasks.composer.validation.assigneeWarning')}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-[var(--ark-border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--ark-text-secondary)] transition hover:bg-[var(--ark-panel-surface)]/60 hover:text-[var(--ark-text-primary)] disabled:opacity-60"
                      onClick={() => setSelectionPanelOpen(true)}
                      disabled={disableInputs}
                    >
                      {t('dashboard.tasks.composer.assignmentCard.button')}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--ark-text-tertiary)]">
                    {t('dashboard.tasks.composer.assignmentCard.description')}
                  </p>
                </section>

                <section className="space-y-3 rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/60 px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--ark-text-secondary)]">
                        {t('dashboard.tasks.composer.attachments.title')}
                      </h3>
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
                      {t('dashboard.tasks.composer.attachments.pickFiles')}
                    </label>
                  </div>
                  {attachmentsError ? (
                    <div className="rounded-xl border border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.12)] px-3 py-2 text-xs font-medium text-[var(--ark-text-primary)]">
                      {attachmentsError}
                    </div>
                  ) : null}
                  {attachmentDrafts.length === 0 ? (
                    <p className="text-xs text-[var(--ark-text-tertiary)]">
                      {t('dashboard.tasks.composer.attachments.empty')}
                    </p>
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
                                {formatFileSize(draft.file.size)} ·{' '}
                                {draft.file.type || t('dashboard.tasks.composer.attachments.unknownType')}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="text-xs font-semibold text-[var(--ark-text-tertiary)] underline underline-offset-4 hover:text-[var(--ark-text-primary)]"
                              onClick={() => removeAttachmentDraft(draft.id)}
                              disabled={disableInputs}
                            >
                              {t('dashboard.tasks.composer.attachments.remove')}
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
              <h4 className="text-sm font-semibold text-[var(--ark-text-secondary)]">
                {t('dashboard.tasks.composer.sidebar.title')}
              </h4>
              <p className="text-xs text-[var(--ark-text-tertiary)]">
                {t('dashboard.tasks.composer.sidebar.description')}
              </p>
            </div>
            {!editing ? (
              <div className="space-y-2 text-xs text-[var(--ark-text-tertiary)]">
                <p>{t('dashboard.tasks.composer.sidebar.membersNote')}</p>
                <p>{t('dashboard.tasks.composer.sidebar.attachmentsDraftNote')}</p>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-[var(--ark-text-tertiary)]">
                <p>{t('dashboard.tasks.composer.sidebar.editingSummary')}</p>
                <p>{t('dashboard.tasks.composer.sidebar.detailNote')}</p>
              </div>
            )}
          </aside>
        </div>

        <footer className="flex justify-end border-t border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/90 px-7 py-5">
          <button
            type="button"
            className="inline-flex h-11 min-w-[144px] items-center justify-center rounded-xl bg-[var(--ark-accent)] px-6 text-sm font-semibold text-[var(--ark-text-inverse)] shadow-[0_24px_56px_-32px_rgba(36,180,126,0.9)] transition hover:translate-y-[-1px] hover:bg-[var(--ark-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSubmit}
            disabled={disableInputs || !groupName || !title.trim() || selectedAssignees.length === 0}
          >
            {submitting ? pendingLabel : actionLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
