'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useLocale, useTranslations } from '@/lib/i18n/client';
import { useOrgContext } from '../org-provider';
import type { Assignment, AssignmentStatus } from './types';
import { useMyAssignments } from './hooks/use-my-assignments';

const STATUS_ORDER: Array<'sent' | 'received' | 'completed' | 'archived'> = [
  'sent',
  'received',
  'completed',
  'archived',
];

const statusColorMap: Record<AssignmentStatus, string> = {
  sent: 'bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200',
  received: 'bg-sky-100 text-sky-800 dark:bg-sky-400/10 dark:text-sky-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200',
  archived: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-300',
};

type DueFilter = 'all' | 'today' | 'week' | 'overdue';

const dueFilterKeys: DueFilter[] = ['all', 'today', 'week', 'overdue'];

function formatDate(value: string | null, locale: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(locale, options ?? { dateStyle: 'medium' }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

function isToday(date: Date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function matchesDueFilter(assignment: Assignment, filter: DueFilter, nowTime: number) {
  if (filter === 'all') return true;
  const dueAt = assignment.task?.dueAt;
  if (!dueAt) return filter !== 'overdue';
  const target = new Date(dueAt);
  const now = new Date(nowTime);
  if (filter === 'overdue') {
    return target.getTime() < now.getTime() && assignment.status !== 'completed';
  }
  if (filter === 'today') {
    return isToday(target);
  }
  if (filter === 'week') {
    const diff = target.getTime() - now.getTime();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }
  return true;
}

function useAssignmentFilters(
  assignments: Assignment[],
  status: string,
  due: DueFilter,
  search: string,
  nowTime: number
) {
  const normalizedSearch = search.trim().toLowerCase();
  return useMemo(() => {
    return assignments
      .filter((assignment) => {
        if (status !== 'all' && assignment.status !== status) {
          return false;
        }
        if (!matchesDueFilter(assignment, due, nowTime)) {
          return false;
        }
        if (normalizedSearch) {
          const candidate = `${assignment.task?.title ?? ''} ${assignment.task?.groupName ?? ''}`
            .toLowerCase()
            .normalize('NFKD');
          if (!candidate.includes(normalizedSearch)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const dueA = a.task?.dueAt ? new Date(a.task?.dueAt).getTime() : Number.POSITIVE_INFINITY;
        const dueB = b.task?.dueAt ? new Date(b.task?.dueAt).getTime() : Number.POSITIVE_INFINITY;
        if (dueA !== dueB) return dueA - dueB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [assignments, due, normalizedSearch, nowTime, status]);
}

export function MyTasksView() {
  const t = useTranslations();
  const locale = useLocale();
  const { organizationsLoading } = useOrgContext();
  const {
    assignments,
    loading,
    refreshing,
    error,
    lastSyncedAt,
    orgId,
    orgName,
    refresh,
    updateStatus,
    updatingIds,
  } = useMyAssignments();

  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [search, setSearch] = useState('');
  const [nowTime, setNowTime] = useState(() => Date.now());

  useEffect(() => {
    setNowTime(Date.now());
  }, [assignments, statusFilter, dueFilter, search]);

  const filteredAssignments = useAssignmentFilters(
    assignments,
    statusFilter,
    dueFilter,
    search,
    nowTime
  );
  const statusCounts = useMemo(() => {
    return assignments.reduce<Record<AssignmentStatus, number>>(
      (acc, assignment) => {
        acc[assignment.status] += 1;
        return acc;
      },
      { sent: 0, received: 0, completed: 0, archived: 0 }
    );
  }, [assignments]);

  const lastSyncedLabel = lastSyncedAt
    ? formatDate(lastSyncedAt, locale, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  const renderEmptyState = () => (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {t('dashboard.myTasks.empty.title')}
      </h3>
      <p className="mt-2">{t('dashboard.myTasks.empty.body')}</p>
    </div>
  );

  if (organizationsLoading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        {t('dashboard.members.loadingOrg')}
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        <p>{t('dashboard.myTasks.subtitle.noOrg')}</p>
        <Link className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-white" href="/organizations">
          {t('dashboard.orgSwitcher.empty')}
        </Link>
      </div>
    );
  }

  const handleStatusChange = async (assignment: Assignment, nextStatus: AssignmentStatus) => {
    if (nextStatus === 'completed') {
      const nextNote = window.prompt(
        t('dashboard.myTasks.actions.notePrompt'),
        assignment.completionNote ?? ''
      );
      if (nextNote === null) return;
      await updateStatus(assignment.id, nextStatus, {
        completionNote: nextNote.trim() ? nextNote.trim() : null,
      });
      return;
    }
    await updateStatus(assignment.id, nextStatus);
  };

  const handleNoteOnly = async (assignment: Assignment) => {
    const nextNote = window.prompt(
      t('dashboard.myTasks.actions.notePrompt'),
      assignment.completionNote ?? ''
    );
    if (nextNote === null) return;
    await updateStatus(assignment.id, assignment.status, {
      completionNote: nextNote.trim() ? nextNote.trim() : null,
    });
  };

  const isLoading = loading || organizationsLoading;
  const showEmpty = !isLoading && !error && filteredAssignments.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {t('dashboard.myTasks.title')}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {orgName
              ? t('dashboard.myTasks.subtitle', { organization: orgName })
              : t('dashboard.myTasks.subtitle.noOrg')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSyncedLabel ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('dashboard.myTasks.lastSynced', { time: lastSyncedLabel })}
            </span>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            {refreshing ? t('common.processing') : t('dashboard.myTasks.refresh')}
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
              {t(`status.${status}`)}
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {statusCounts[status] ?? 0}
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <span className="font-medium">{t('dashboard.myTasks.filters.status')}</span>
            <select
              className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | AssignmentStatus)}
            >
              <option value="all">{t('status.all')}</option>
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <span className="font-medium">{t('dashboard.myTasks.filters.due')}</span>
            <select
              className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
              value={dueFilter}
              onChange={(event) => setDueFilter(event.target.value as DueFilter)}
            >
              {dueFilterKeys.map((key) => (
                <option key={key} value={key}>
                  {t(`dashboard.myTasks.dueFilters.${key}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="w-full sm:w-64">
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <span className="font-medium">{t('dashboard.myTasks.filters.search')}</span>
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            placeholder={t('dashboard.myTasks.filters.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          <div className="flex items-center justify-between gap-3">
            <p>{t('dashboard.myTasks.error')}</p>
            <button
              type="button"
              className="text-xs font-semibold underline"
              onClick={() => void refresh()}
            >
              {t('dashboard.myTasks.refresh')}
            </button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : showEmpty ? (
        renderEmptyState()
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => {
            const dueLabel = assignment.task?.dueAt
              ? t('dashboard.myTasks.assignment.due', {
                  date: formatDate(assignment.task?.dueAt, locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }),
                })
              : t('dashboard.myTasks.assignment.noDue');
            const overdue =
              assignment.task?.dueAt &&
              new Date(assignment.task?.dueAt).getTime() < nowTime &&
              assignment.status !== 'completed';
            const updating = updatingIds.includes(assignment.id);
            return (
              <article
                key={assignment.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColorMap[assignment.status]}`}>
                        {t(`status.${assignment.status}`)}
                      </span>
                      {overdue ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-200">
                          {t('dashboard.myTasks.dueFilters.overdue')}
                        </span>
                      ) : null}
                      {assignment.reviewStatus === 'changes_requested' ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
                          {t('dashboard.myTasks.assignment.reviewChanges')}
                        </span>
                      ) : assignment.reviewStatus === 'accepted' ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
                          {t('dashboard.myTasks.assignment.reviewAccepted')}
                        </span>
                      ) : assignment.reviewStatus === 'pending' && assignment.status === 'completed' ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700/30 dark:text-slate-200">
                          {t('dashboard.myTasks.assignment.reviewPending')}
                        </span>
                      ) : null}
                      {assignment.task?.requireAttachment ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-200">
                          {t('dashboard.myTasks.assignment.requireAttachment')}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {assignment.task?.title ?? t('dashboard.myTasks.assignment.noTitle')}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {assignment.task?.description ?? t('common.notSet')}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{assignment.task?.groupName ?? t('dashboard.analytics.common.unassignedGroup')}</span>
                      <span>{dueLabel}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:min-w-[200px]">
                    <select
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      value={assignment.status}
                      onChange={(event) =>
                        void handleStatusChange(assignment, event.target.value as AssignmentStatus)
                      }
                      disabled={updating}
                    >
                      {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>
                          {t(`status.${status}`)}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      {assignment.status === 'sent' ? (
                        <button
                          type="button"
                          className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
                          disabled={updating}
                          onClick={() => void handleStatusChange(assignment, 'received')}
                        >
                          {t('dashboard.myTasks.actions.markReceived')}
                        </button>
                      ) : assignment.status === 'received' ? (
                        <button
                          type="button"
                          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                          disabled={updating}
                          onClick={() => void handleStatusChange(assignment, 'completed')}
                        >
                          {t('dashboard.myTasks.actions.markCompleted')}
                        </button>
                      ) : assignment.status === 'completed' ? (
                        <button
                          type="button"
                          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200"
                          disabled={updating}
                          onClick={() => void handleStatusChange(assignment, 'received')}
                        >
                          {t('dashboard.myTasks.actions.reopen')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200"
                          disabled={updating}
                          onClick={() => void handleStatusChange(assignment, 'sent')}
                        >
                          {t('dashboard.myTasks.actions.markSent')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        disabled={updating}
                        onClick={() => void handleNoteOnly(assignment)}
                      >
                        {t('dashboard.myTasks.actions.updateNote')}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
