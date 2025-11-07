'use client';

import type { SVGProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLocale, useTranslations } from '@/lib/i18n/client';

import {
  PaginationControls,
  usePagination,
} from '../../components/pagination';
import type { TaskItem } from '../types';

type TaskListProps = {
  tasks: TaskItem[];
  loading: boolean;
  onViewAssignments: (taskId: string) => void;
  assignmentSummary: (taskId: string) => string;
  onEditTask: (task: TaskItem) => void;
  onDeleteTasks: (taskIds: string[]) => Promise<void>;
};

export function TaskList({
  tasks,
  loading,
  onViewAssignments,
  assignmentSummary,
  onEditTask,
  onDeleteTasks,
}: TaskListProps) {
  const t = useTranslations();
  const locale = useLocale();
  const pagination = usePagination(tasks, { pageSize: 10 });
  const formatDateTime = useCallback(
    (value: string) => new Date(value).toLocaleString(locale),
    [locale]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => tasks.some((task) => task.id === id)));
  }, [tasks]);

  const currentPageIds = useMemo(
    () => pagination.paginatedItems.map((task) => task.id),
    [pagination.paginatedItems],
  );

  const selectedCount = selectedIds.length;
  const allSelectedOnPage =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selectedCount > 0 && !allSelectedOnPage && currentPageIds.length > 0;
    }
  }, [selectedCount, allSelectedOnPage, currentPageIds.length]);

  const toggleRow = (taskId: string) => {
    setSelectedIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  };

  const toggleAllOnPage = () => {
    if (allSelectedOnPage) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => {
      const merged = new Set(prev);
      currentPageIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  const confirmDelete = (count: number) => {
    if (typeof window === 'undefined') return true;
    return window.confirm(t('dashboard.tasks.list.confirmDelete', { count }));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || deleting) return;
    if (!confirmDelete(selectedIds.length)) return;
    setDeleting(true);
    try {
      await onDeleteTasks(selectedIds);
      setSelectedIds([]);
    } finally {
      setDeleting(false);
    }
  };

  const handleRowDelete = async (taskId: string) => {
    if (deleting) return;
    if (!confirmDelete(1)) return;
    setDeleting(true);
    try {
      await onDeleteTasks([taskId]);
      setSelectedIds((prev) => prev.filter((id) => id !== taskId));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)] shadow-[0_26px_80px_-50px_rgba(8,13,20,0.85)]">
      <div className="flex flex-col gap-3 border-b border-[var(--ark-border-subtle)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ark-text-primary)]">
            {t('dashboard.tasks.list.title')}
          </h3>
          <p className="text-xs text-[var(--ark-text-tertiary)]">
            {t('dashboard.tasks.list.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--ark-text-tertiary)]">
          <span>{t('dashboard.tasks.list.total', { count: tasks.length })}</span>
          {selectedCount > 0 ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.12)] px-3 py-1 text-xs font-semibold text-[var(--ark-text-primary)] transition hover:translate-y-[-1px]"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              {t('dashboard.tasks.list.bulkDelete', { count: selectedCount })}
            </button>
          ) : null}
        </div>
      </div>
      {loading ? (
        <div className="px-6 py-6 text-sm text-[var(--ark-text-tertiary)]">
          {t('dashboard.tasks.list.loading')}
        </div>
      ) : tasks.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-[var(--ark-text-tertiary)]">
          {t('dashboard.tasks.list.empty')}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm text-[var(--ark-text-secondary)]">
              <thead>
                <tr className="border-b border-[var(--ark-border-subtle)] text-xs uppercase tracking-wide text-[var(--ark-text-tertiary)]">
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--ark-border-subtle)] text-[var(--ark-accent)] focus:ring-[var(--ark-accent)]"
                      onChange={toggleAllOnPage}
                      checked={currentPageIds.length > 0 && allSelectedOnPage}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    {t('dashboard.tasks.list.columns.task')}
                  </th>
                  <th className="px-4 py-3 text-left">
                    {t('dashboard.tasks.list.columns.progress')}
                  </th>
                  <th className="w-56 px-4 py-3 text-left">
                    {t('dashboard.tasks.list.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map((task) => {
                  const isSelected = selectedIds.includes(task.id);
                  return (
                    <tr
                      key={task.id}
                      className={`border-b border-[var(--ark-border-subtle)] transition ${
                        isSelected
                          ? "bg-[var(--ark-panel-surface)]/70"
                          : "hover:bg-[var(--ark-panel-surface)]/50"
                      }`}
                    >
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--ark-border-subtle)] text-[var(--ark-accent)] focus:ring-[var(--ark-accent)]"
                          checked={isSelected}
                          onChange={() => toggleRow(task.id)}
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="text-sm font-semibold text-[var(--ark-text-primary)]">
                          {task.title}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-[var(--ark-text-tertiary)]">
                          <span>
                            {t('dashboard.tasks.list.meta.createdAt', {
                              date: formatDateTime(task.created_at),
                            })}
                          </span>
                          {task.due_at ? (
                            <span>
                              {t('dashboard.tasks.list.meta.dueAt', {
                                date: formatDateTime(task.due_at),
                              })}
                            </span>
                          ) : null}
                          {task.require_attachment ? (
                            <span className="inline-flex items-center rounded-full bg-[rgba(62,207,142,0.14)] px-2 py-0.5 text-[var(--ark-accent)] shadow-[0_0_0_1px_rgba(62,207,142,0.25)]">
                              {t('dashboard.tasks.list.requiresAttachment')}
                            </span>
                          ) : null}
                        </div>
                        {task.description ? (
                          <p className="mt-3 line-clamp-2 text-sm text-[var(--ark-text-secondary)]">
                            {task.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-[var(--ark-text-tertiary)]">
                        {assignmentSummary(task.id)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            aria-label={t('dashboard.tasks.list.actions.edit')}
                            title={t('dashboard.tasks.list.actions.edit')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ark-border-subtle)] text-[var(--ark-text-secondary)] transition hover:bg-[var(--ark-panel-surface)]/60 hover:text-[var(--ark-text-primary)] disabled:opacity-50"
                            onClick={() => onEditTask(task)}
                            disabled={deleting}
                          >
                            <EditIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={t('dashboard.tasks.list.actions.delete')}
                            title={t('dashboard.tasks.list.actions.delete')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(248,113,113,0.45)] text-[rgba(248,113,113,0.9)] transition hover:bg-[rgba(248,113,113,0.12)] disabled:opacity-50"
                            onClick={() => void handleRowDelete(task.id)}
                            disabled={deleting}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={t('dashboard.tasks.list.actions.view')}
                            title={t('dashboard.tasks.list.actions.view')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ark-border-subtle)] text-[var(--ark-text-secondary)] transition hover:bg-[var(--ark-panel-surface)]/60 hover:text-[var(--ark-text-primary)]"
                            onClick={() => void onViewAssignments(task.id)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--ark-border-subtle)] px-6 py-4">
            <PaginationControls
              page={pagination.page}
              pageCount={pagination.pageCount}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              onPageChange={pagination.setPage}
              pageSize={pagination.pageSize}
              onPageSizeChange={pagination.setPageSize}
              label={t('dashboard.tasks.list.paginationLabel')}
            />
          </div>
        </>
      )}
    </div>
  );
}

type IconProps = SVGProps<SVGSVGElement>;

function EditIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M16.862 3.487l3.65 3.651L7.5 20.15 3.75 20.25l.1-3.75L16.862 3.487z" />
      <path d="M14.25 5.25l3.75 3.75" />
    </svg>
  );
}

function TrashIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M9 4.5V3.75A2.25 2.25 0 0111.25 1.5h1.5A2.25 2.25 0 0115 3.75V4.5" />
      <path d="M4.5 6.75h15" />
      <path d="M6.375 6.75L7.5 19.125A2.25 2.25 0 009.738 21h4.524A2.25 2.25 0 0016.5 19.125L17.625 6.75" />
      <path d="M10 10.5l-.375 7.5m4.125 0L13.375 10.5" />
    </svg>
  );
}

function EyeIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
  );
}
