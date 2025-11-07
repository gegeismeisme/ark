'use client';

import { useTranslations } from '@/lib/i18n/client';

import { GroupSidebar } from './components/GroupSidebar';
import { TaskComposer } from './components/TaskComposer';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { TaskList } from './components/TaskList';
import { useTaskDashboard } from './hooks/use-task-dashboard';

export default function TasksPage() {
  const {
    organizationsLoading,
    groups,
    selectedGroup,
    groupMembers,
    tagCategories,
    assignees,
    composer,
    tasks,
    detail,
  } = useTaskDashboard();
  const t = useTranslations();

  const hasAnyError =
    groups.error || groupMembers.error || tagCategories.error || tasks.error || composer.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {t('dashboard.tasks.page.title')}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t('dashboard.tasks.page.description')}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
          onClick={composer.open}
          disabled={
            !selectedGroup ||
            composer.submitting ||
            groupMembers.loading ||
            organizationsLoading ||
            groups.loading
          }
        >
          {t('dashboard.tasks.page.createButton')}
        </button>
      </div>

      {hasAnyError ? (
        <div className="space-y-3">
          {groups.error ? <Alert tone="error" message={groups.error} /> : null}
          {groupMembers.error ? <Alert tone="warning" message={groupMembers.error} /> : null}
          {tagCategories.error ? <Alert tone="warning" message={tagCategories.error} /> : null}
          {tasks.error ? <Alert tone="error" message={tasks.error} /> : null}
          {composer.error ? <Alert tone="error" message={composer.error} /> : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <GroupSidebar
          groups={groups.list}
          loading={groups.loading || organizationsLoading}
          selectedGroupId={groups.selectedId}
          onSelect={groups.select}
        />

        <div className="space-y-4">
          <TaskList
            tasks={tasks.list}
            loading={tasks.loading}
            onViewAssignments={tasks.viewAssignments}
            assignmentSummary={tasks.summary}
            onEditTask={composer.startEdit}
            onDeleteTasks={tasks.delete}
          />

          <TaskDetailPanel
            taskId={detail.taskId}
            requireAttachment={detail.requireAttachment}
            records={detail.records}
            loading={detail.loading}
            error={detail.error}
            onClose={detail.close}
            onReview={detail.review}
            attachments={detail.attachments}
          />
        </div>
      </div>

      <TaskComposer
        mode={composer.mode}
        open={composer.isOpen}
        onClose={composer.close}
        groupName={selectedGroup?.name ?? null}
        title={composer.title}
        setTitle={composer.setTitle}
        description={composer.description}
        setDescription={composer.setDescription}
        dueAt={composer.dueAt}
        setDueAt={composer.setDueAt}
        submitting={composer.submitting}
        error={composer.error}
        onSubmit={composer.submit}
        selectedAssignees={assignees.selected}
        toggleAssignee={assignees.toggle}
        selectAll={assignees.selectAll}
        clearAssignees={assignees.clear}
        filteredMembers={groupMembers.filtered}
        membersLoading={groupMembers.loading}
        totalMembers={groupMembers.list.length}
        tagCategoriesLoading={tagCategories.loading}
        filterableCategories={tagCategories.filterable}
        tagFilters={tagCategories.tagFilters}
        tagSelectionLabels={tagCategories.selectionLabels}
        hasActiveFilters={tagCategories.hasActiveFilters}
        activeFilterCount={tagCategories.activeFilterCount}
        resetTagFilters={tagCategories.resetFilters}
        handleTagFilterSingleChange={tagCategories.handleSingleChange}
        handleTagFilterToggle={tagCategories.handleToggle}
        requireAttachment={composer.requireAttachment}
        setRequireAttachment={composer.setRequireAttachment}
        attachmentDrafts={composer.attachments.pending}
        addAttachmentDrafts={composer.attachments.addFiles}
        removeAttachmentDraft={composer.attachments.removeFile}
        attachmentsUploading={composer.attachments.uploading}
        attachmentsError={composer.attachments.error}
      />
    </div>
  );
}

type AlertTone = 'error' | 'warning';

function Alert({ tone, message }: { tone: AlertTone; message: string }) {
  const toneStyles =
    tone === 'error'
      ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'
      : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200';
  return <div className={`rounded-md border p-3 text-sm ${toneStyles}`}>{message}</div>;
}
